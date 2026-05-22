export interface CategoryOption {
  id: string;
  name: string;
  categoryslug: string;
}

export interface CategorySchemaFormValues {
  name: string;
}

export type SelectWithAddNewType = "category";
