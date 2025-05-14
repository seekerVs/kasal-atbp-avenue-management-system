// src/types/color-name-list.d.ts
declare module "color-name-list" {
  interface ColorName {
    name: string;
    hex: string;
  }

  const colorNames: ColorName[];
  export default colorNames;
}
