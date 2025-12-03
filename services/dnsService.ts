import { MXRecordInfo } from '../types';

interface GoogleDNSResponse {
  Status: number;
  Answer?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
}

export const analyzeMXRecords = async (domain: string): Promise<MXRecordInfo> => {
  try {
    // Clean domain (remove protocol, www, path)
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    // Use Google DNS-over-HTTPS API to bypass browser DNS limitations
    const response = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=MX`);
    
    if (!response.ok) {
      throw new Error('Error connecting to DNS service');
    }

    const data: GoogleDNSResponse = await response.json();
    
    if (!data.Answer || data.Answer.length === 0) {
      return {
        providerName: 'No Encontrado / Desconocido',
        isGoogleWorkspace: false,
        rawRecords: [],
      };
    }

    const rawRecords = data.Answer.map(r => r.data);
    
    // Check for Google signatures in MX records
    const isGoogle = rawRecords.some(record => 
      record.includes('google.com') || 
      record.includes('googlemail.com') ||
      record.includes('aspmx.l.google.com')
    );

    let providerName = 'Otro Proveedor';
    if (isGoogle) {
      providerName = 'Google Workspace';
    } else if (rawRecords.some(r => r.includes('outlook') || r.includes('protection.outlook.com'))) {
      providerName = 'Microsoft 365 / Outlook';
    } else if (rawRecords.some(r => r.includes('zoho'))) {
      providerName = 'Zoho Mail';
    } else if (rawRecords.some(r => r.includes('godaddy') || r.includes('secureserver.net'))) {
      providerName = 'GoDaddy Email';
    } else if (rawRecords.some(r => r.includes('cpanel') || r.includes('hostgator') || r.includes('bluehost'))) {
      providerName = 'Hosting Tradicional (cPanel)';
    }

    return {
      providerName,
      isGoogleWorkspace: isGoogle,
      rawRecords,
    };

  } catch (error) {
    console.error("DNS Analysis failed:", error);
    return {
      providerName: 'Error al consultar DNS',
      isGoogleWorkspace: false,
      rawRecords: [],
    };
  }
};