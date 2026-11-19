export interface Batch {
  id: string | number;
  title: string;
  thumbnail: string;
}

export interface Subject {
  subjectid: string;
  subject_name: string;
  subject_logo?: string;
  sortingparam?: string | number;
}

export interface Topic {
  topicid: string;
  topic_name: string;
  topic_logo?: string;
  sortingparam?: number;
}

export interface DownloadLink {
  quality?: string;
  path?: string;
  decryptedUrl?: string;
}

export interface ContentItem {
  id: string | number;
  Title?: string;
  title?: string;
  material_type?: string;
  thumbnail?: string;
  duration?: string | number;
  strtotime?: string | number;
  sortingparam?: string | number;
  pdf_link?: string;
  pdf_link2?: string;
  file_link?: string;
  download_links?: DownloadLink[];
  youtube_id?: string;
  embed_url?: string;
  isPdf1?: boolean;
}

export interface LiveClassItem {
  id: string | number;
  Title: string;
  thumbnail?: string;
  date_and_time?: string;
}

export interface TestSeriesItem {
  id: string | number;
  title: string;
  logo?: string;
  totaltesttitle?: string | number;
}

export interface QualityOption {
  label: string;
  url: string;
}

export type TabKey = 'new' | 'wishlist';

export type PlayerMode = 'video' | 'youtube' | 'pdf';

export interface ContentContext {
  batch: Batch;
  subject: Subject;
  topic: Topic;
}

export type ViewState =
  | { view: 'home' }
  | { view: 'subject'; batch: Batch }
  | { view: 'topic'; batch: Batch; subject: Subject }
  | { view: 'content'; batch: Batch; subject: Subject; topic: Topic }
  | {
      view: 'player';
      url: string;
      title: string;
      mode: PlayerMode;
      prevState: ContentContext;
    };

export interface MediaModalState {
  batch: Batch;
  item: ContentItem;
  mode: 'video' | 'pdf';
  pdfType?: string;
  subject: Subject;
  topic: Topic;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}
