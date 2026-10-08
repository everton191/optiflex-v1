export interface ClinicalRecord {
  attendanceId: string;
  anamnesis: string;
  examination: string;
  prescription: string;
  requests: string;
  attachments: ClinicalAttachment[];
  finalizedAt?: string;
  updatedAt: string;
  revision?: number;
  version?: number;
  author?: string;
  amendmentReason?: string;
}

export interface ClinicalVersion extends ClinicalRecord { id: string; finalizedAt: string; }

export interface ClinicalAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}
