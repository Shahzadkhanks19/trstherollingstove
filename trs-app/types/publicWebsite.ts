export type PublicPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PublicBusinessInfo = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  openingHours: Record<string, unknown>;
  socialLinks: Record<string, unknown>;
};
