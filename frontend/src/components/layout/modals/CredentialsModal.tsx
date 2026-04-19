import React, { useState, useEffect, useCallback } from 'react';
import { Modal, ModalButton, ModalInput, ModalLabel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { CredentialsService } from '../../../lib/credentials_service';
import { db } from '../../../../wailsjs/go/models';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (credentialId: number) => void; // Opzionale: permette di selezionare una credenziale subito dopo la creazione
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [credentials, setCredentials] = useState<db.Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, string>>({});

  const loadCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await CredentialsService.getCredentials();
      setCredentials(resp || []);
    } catch (err) {
      console.error("Failed to load credentials:", err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCredentials();
      resetForm();
    }
  }, [isOpen, loadCredentials]);

  const resetForm = () => {
    setLabel('');
    setUsername('');
    setPassword('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleCreateNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (c: db.Credential) => {
    setLabel(c.label);
    setUsername(c.username);
    setPassword(''); // Non mostriamo la password nel form a meno che non venga cambiata
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await CredentialsService.updateCredential(editingId, label, username, password || undefined);
      } else {
        const newId = await CredentialsService.addCredential(label, username, password);
        if (onSelect) {
          onSelect(newId);
        }
      }
      loadCredentials();
      resetForm();
    } catch (err) {
      console.error("Failed to save credential:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Sei sicuro di voler eliminante questo profilo di credenziali?")) {
      await CredentialsService.deleteCredential(id);
      loadCredentials();
    }
  };

  const togglePasswordVisibility = async (id: number) => {
    if (visiblePasswords[id]) {
      const newVisible = { ...visiblePasswords };
      delete newVisible[id];
      setVisiblePasswords(newVisible);
    } else {
      try {
        const pass = await CredentialsService.getPassword(id);
        setVisiblePasswords({ ...visiblePasswords, [id]: pass });
      } catch (err) {
        console.error("Failed to fetch password:", err);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestione Credenziali"
      width="max-w-2xl"
      footer={
        <div className="flex justify-between w-full">
          {!showForm ? (
            <>
              <ModalButton variant="secondary" onClick={onClose}>Chiudi</ModalButton>
              <ModalButton variant="primary" onClick={handleCreateNew}>
                Nuovo Profilo
              </ModalButton>
            </>
          ) : (
            <>
              <ModalButton variant="secondary" onClick={resetForm}>Annulla</ModalButton>
              <ModalButton 
                variant="primary" 
                onClick={handleSave}
                disabled={!label.trim() || !username.trim()}
              >
                Salva Profilo
              </ModalButton>
            </>
          )}
        </div>
      }
    >
      {showForm ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <ModalLabel>Etichetta Profilo</ModalLabel>
            <ModalInput 
              value={label} 
              onChange={(e: any) => setLabel(e.target.value)} 
              placeholder="es. Account Amministratore Core"
              autoFocus
            />
            <p className="text-[11px] text-rd-text-dim mt-1">Un nome descrittivo per riconoscere questo profilo.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ModalLabel>Username</ModalLabel>
              <ModalInput 
                value={username} 
                onChange={(e: any) => setUsername(e.target.value)} 
                placeholder="admin"
              />
            </div>
            <div>
              <ModalLabel>{editingId ? 'Nuova Password (opzionale)' : 'Password'}</ModalLabel>
              <ModalInput 
                type="password" 
                value={password} 
                onChange={(e: any) => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
          </div>
          {editingId && (
            <div className="p-3 bg-white/5 rounded border border-white/10 flex items-start gap-3">
              <Icon name="activity" size={16} className="text-rd-accent mt-0.5" />
              <p className="text-[12px] text-rd-text-dim leading-relaxed">
                Stai modificando un profilo esistente. Se cambi la password, verrà aggiornata per tutti gli host associati. 
                Lascia il campo password vuoto per mantenere quella attuale.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {isLoading ? (
            <div className="py-8 flex justify-center italic text-rd-text-dim text-[13px]">Caricamento...</div>
          ) : credentials.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-rd-text-dim border-2 border-dashed border-white/5 rounded-lg bg-white/[0.02]">
              <Icon name="network" size={32} className="opacity-20 mb-3" />
              <p className="text-[13px]">Nessun profilo salvato.</p>
              <button onClick={handleCreateNew} className="text-rd-accent hover:underline text-[12px] mt-1">Crea il tuo primo profilo</button>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {credentials.map(c => (
                <div 
                  key={c.id}
                  className="group p-3 bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-md transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-[13px] font-medium text-rd-text-active">{c.label}</div>
                      <div className="text-[11px] text-rd-text-dim flex items-center gap-2">
                        <span className="font-mono text-rd-accent/70">{c.username}</span>
                        <span className="opacity-30">•</span>
                        {visiblePasswords[c.id] ? (
                          <span className="text-rd-text font-mono tracking-tight">{visiblePasswords[c.id]}</span>
                        ) : (
                          <span className="opacity-50">••••••••</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => togglePasswordVisibility(c.id)}
                      className="p-1.5 hover:bg-white/10 rounded text-rd-text hover:text-rd-accent transition-colors"
                      title={visiblePasswords[c.id] ? "Nascondi password" : "Mostra password"}
                    >
                      <Icon name={visiblePasswords[c.id] ? "eyeOff" : "eye"} size={14} />
                    </button>
                    <button 
                      onClick={() => handleEdit(c)}
                      className="p-1.5 hover:bg-white/10 rounded text-rd-text hover:text-rd-text-active transition-colors"
                      title="Modifica"
                    >
                      <Icon name="settings" size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded text-rd-text hover:text-red-400 transition-colors"
                      title="Elimina"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
