#include <tree_sitter/parser.h>
#include <wctype.h>
#include <string.h>

enum TokenType {
  INDENT,
  DEDENT,
  NEWLINE,
  FIELD_SEPARATOR,
  DASHED_LINE,
  CONSOLE_PROMPT,
  WHITESPACE,
  LINE_CONTENT
};

#define MAX_INDENT_STACK 100

typedef struct {
  uint16_t indents[MAX_INDENT_STACK];
  uint8_t indent_count;
} Scanner;

void *tree_sitter_cisco_external_scanner_create() {
  Scanner *scanner = (Scanner *)calloc(1, sizeof(Scanner));
  scanner->indents[0] = 0;
  scanner->indent_count = 1;
  return scanner;
}

void tree_sitter_cisco_external_scanner_destroy(void *payload) {
  free(payload);
}

unsigned tree_sitter_cisco_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = (Scanner *)payload;
  size_t size = scanner->indent_count * sizeof(uint16_t);
  memcpy(buffer, scanner->indents, size);
  return (unsigned)size;
}

void tree_sitter_cisco_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  if (length > 0) {
    scanner->indent_count = (uint8_t)(length / sizeof(uint16_t));
    memcpy(scanner->indents, buffer, length);
  } else {
    scanner->indents[0] = 0;
    scanner->indent_count = 1;
  }
}

static bool scan_dashed_line(TSLexer *lexer) {
  uint32_t count = 0;
  bool has_dash = false;
  
  while (lexer->lookahead == '-' || lexer->lookahead == '=' || lexer->lookahead == ' ' || lexer->lookahead == '\t') {
    if (lexer->lookahead == '-' || lexer->lookahead == '=') {
      has_dash = true;
      count++;
    }
    lexer->advance(lexer, false);
  }
  
  return has_dash && count >= 3;
}

static bool scan_console_prompt(TSLexer *lexer) {
  if (lexer->lookahead == '-') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '-') {
      lexer->advance(lexer, false);
      const char *more = "More--";
      for (int i = 0; more[i] != '\0'; i++) {
        if (lexer->lookahead != more[i]) return false;
        lexer->advance(lexer, false);
      }
      return true;
    }
  } else if (lexer->lookahead == '[') {
    lexer->advance(lexer, false);
    const char *confirm = "confirm]";
    for (int i = 0; confirm[i] != '\0'; i++) {
      if (lexer->lookahead != confirm[i]) return false;
      lexer->advance(lexer, false);
    }
    return true;
  }
  return false;
}

bool tree_sitter_cisco_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;

  // Handle EOF
  if (lexer->eof(lexer)) {
    if (valid_symbols[DEDENT] && scanner->indent_count > 1) {
      scanner->indent_count--;
      lexer->result_symbol = DEDENT;
      return true;
    }
    return false;
  }

  // 1. CONSOLE_PROMPT (High Priority)
  if (valid_symbols[CONSOLE_PROMPT]) {
    if (scan_console_prompt(lexer)) {
      lexer->result_symbol = CONSOLE_PROMPT;
      return true;
    }
  }

  // 2. DASHED_LINE
  if (valid_symbols[DASHED_LINE]) {
    if (scan_dashed_line(lexer)) {
      lexer->result_symbol = DASHED_LINE;
      return true;
    }
  }

  // 3. WHITESPACE & FIELD_SEPARATOR
  if (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
    uint32_t space_count = 0;
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
      lexer->advance(lexer, true);
      space_count++;
    }

    if (valid_symbols[FIELD_SEPARATOR] && space_count >= 2 && lexer->get_column(lexer) > space_count) {
      lexer->result_symbol = FIELD_SEPARATOR;
      return true;
    }

    if (valid_symbols[WHITESPACE]) {
      lexer->result_symbol = WHITESPACE;
      return true;
    }
  }

  // 4. NEWLINE (Must consume trailing whitespace)
  if (valid_symbols[NEWLINE]) {
    if (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
      if (lexer->lookahead == '\r') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '\n') lexer->advance(lexer, false);
      } else {
        lexer->advance(lexer, false);
      }
      lexer->result_symbol = NEWLINE;
      return true;
    }
  }

  // 5. INDENT / DEDENT
  if (valid_symbols[INDENT] || valid_symbols[DEDENT]) {
    uint16_t current_indent = (uint16_t)lexer->get_column(lexer);

    // Skip blank lines or comments for indent calculation
    if (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
      return false;
    }

    uint16_t last_indent = scanner->indents[scanner->indent_count - 1];

    if (valid_symbols[INDENT] && current_indent > last_indent) {
      scanner->indents[scanner->indent_count++] = current_indent;
      lexer->result_symbol = INDENT;
      return true;
    }

    if (valid_symbols[DEDENT] && current_indent < last_indent) {
      scanner->indent_count--;
      lexer->result_symbol = DEDENT;
      return true;
    }
  }

  // 6. LINE_CONTENT (Very Low Priority fallback)
  if (valid_symbols[LINE_CONTENT]) {
    bool has_content = false;
    while (lexer->lookahead != '\n' && lexer->lookahead != '\r' && !lexer->eof(lexer)) {
      has_content = true;
      lexer->advance(lexer, false);
    }
    if (has_content) {
      lexer->result_symbol = LINE_CONTENT;
      return true;
    }
  }

  return false;
}
