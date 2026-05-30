export interface CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  imageKey?: string | null;
  imageUrl?: string | null;
}

export interface CreateCategoryInputDto {
  name: string;
  slug: string;
  imageKey?: string;
}

export interface UpdateCategoryInputDto {
  id: string;
  name?: string;
  slug?: string;
  imageKey?: string | null;
}

export interface ListCategoriesInputDto {
  skip?: number;
  take?: number;
}
