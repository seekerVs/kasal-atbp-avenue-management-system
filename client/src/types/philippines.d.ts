declare module 'philippines' {
  export function getProvinces(): string[];
  export function getCitiesByProvince(provinceName: string): string[];
  export function getBarangaysByCity(cityName: string): string[];
}