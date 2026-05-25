export interface FaqResponseDto {
  id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFaqInputDto {
  question: string;
  answer: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateFaqInputDto {
  id: string;
  question?: string;
  answer?: string;
  order?: number;
  isActive?: boolean;
}

export interface ListFaqsInputDto {
  skip?: number;
  take?: number;
  isActive?: boolean;
  search?: string;
}
