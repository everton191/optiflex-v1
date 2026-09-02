export interface ClinicalRecord {
  attendanceId: string;
  anamnesis: string;
  examination: string;
  prescription: string;
  requests: string;
  attachments: ClinicalAttachment[];
  finalizedAt?: string;
  updatedAt: string;
}

export interface ClinicalAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}
