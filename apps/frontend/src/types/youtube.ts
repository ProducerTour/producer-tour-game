export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  privacy: 'public' | 'unlisted' | 'private';
  scheduledTime?: Date;
}

export interface VideoWithMetadata {
  videoId: string;
  videoName: string;
  videoBlob: Blob;
  videoUrl: string;
  metadata?: YouTubeMetadata;
}

export type TitleTemplate = (originalName: string) => string;
export type DescriptionTemplate = string | ((originalName: string) => string);

export interface Templates {
  titleTemplates: Record<string, TitleTemplate>;
  descriptionTemplates: Record<string, DescriptionTemplate>;
}
