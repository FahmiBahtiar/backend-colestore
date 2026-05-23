export interface CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
}

export interface CreateCategoryInputDto {
  name: string;
  slug: string;
}

export interface UpdateCategoryInputDto {
  id: string;
  name?: string;
  slug?: string;
}

export interface ListCategoriesInputDto {
  skip?: number;
  take?: number;
}
