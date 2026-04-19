import { 
    GetCredentials, 
    AddCredential, 
    UpdateCredential, 
    DeleteCredential,
    GetCredentialPassword 
} from '../../wailsjs/go/main/App';
import { db } from '../../wailsjs/go/models';

export class CredentialsService {
    static async getCredentials(): Promise<db.Credential[]> {
        return await GetCredentials();
    }

    static async addCredential(label: string, username: string, password?: string): Promise<number> {
        const cred = new db.Credential({
            label,
            username,
            password: password || ""
        });
        return await AddCredential(cred);
    }

    static async updateCredential(id: number, label: string, username: string, password?: string): Promise<void> {
        const cred = new db.Credential({
            id,
            label,
            username,
            password: password || ""
        });
        await UpdateCredential(cred);
    }

    static async deleteCredential(id: number): Promise<void> {
        await DeleteCredential(id);
    }

    static async getPassword(id: number): Promise<string> {
        return await GetCredentialPassword(id);
    }
}
