export interface Profile {
  id: string;
  name: string;
  role: 'partner_1' | 'partner_2';
  avatar_color: string;
}

export interface Trip {
  id: string;
  title: string;
  country_code: string;
  city?: string | null;
  start_date: string;
  end_date: string;
  cover_image?: string | null;
  status: 'active' | 'completed' | 'planned';
  summary?: string | null;
  total_cost?: number | null;
  cost_currency?: string | null;
  inclusions?: string | null;
  cost_notes?: string | null;
  temp_min?: number | null;
  temp_max?: number | null;
  artifact_count?: number;
  currency_count?: number;
  log_count?: number;
  photo_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TripPhoto {
  id: string;
  trip_id: string;
  image_url: string;
  medium_url?: string | null;
  thumb_url?: string | null;
  caption?: string | null;
  location?: string | null;
  taken_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ArtifactCategory = 'coin' | 'banknote' | 'ticket' | 'postcard' | 'souvenir';

export interface Artifact {
  id: string;
  trip_id?: string | null;
  collector_profile_id?: string | null;
  category: ArtifactCategory;
  title: string;
  currency_code?: string | null;
  denomination?: string | null;
  year?: number | null;
  image_front: string;
  image_back?: string | null;
  story?: string | null;
  trip_title?: string | null;
  country_code?: string | null;
  created_at?: string;
  updated_at?: string;
  pendingSync?: boolean;
}

export interface TripLog {
  id: string;
  trip_id: string;
  day_number?: number | null;
  log_date: string;
  title?: string | null;
  notes_partner_1?: string | null;
  notes_partner_2?: string | null;
  photos?: string | null;
  created_at?: string;
  updated_at?: string;
}
