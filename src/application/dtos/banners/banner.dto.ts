export interface BannerResponseDto {
  id: string;
  title: string | null;
  subtitle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  imageKey: string;
  imageUrl?: string | null; // presigned preview URL
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBannerInputDto {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  imageKey: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateBannerInputDto {
  id: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  imageKey?: string;
  isActive?: boolean;
  order?: number;
}

export interface ListBannersInputDto {
  skip?: number;
  take?: number;
  isActive?: boolean;
}
