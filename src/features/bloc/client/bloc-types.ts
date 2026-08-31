"use client";

export type BlocNote = {
  id: string;
  title: string;
  contentHtml: string;
  contentText: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type BlocTrashedNote = BlocNote & { deleted_at: string };

export type BlocSettings = {
  fontSize: "sm" | "base" | "lg";
  defaultTitle: string;
};

export const blocKey = "d1os:notepad:v1";

export const legacyBlocKey = "techlife.bloc.D1OS.v1";

export const blocSettingsKey = "d1os:notepad:settings:v1";

export const legacyBlocSettingsKey = "techlife.bloc.settings.D1OS.v1";

export const defaultTitle = "Documento sin titulo";

export const defaultEditorFontSize = 16;

export const editorFonts = [
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Aptos", label: "Aptos" },
  { value: "Calibri", label: "Calibri" },
  { value: "Verdana", label: "Verdana" },
  { value: "Tahoma", label: "Tahoma" },
  { value: "Trebuchet MS", label: "Trebuchet" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
] as const;

export type ListTab = "todas" | "recientes" | "favoritas";

export type MobileSheetId = "settings" | "format" | null;

export type EditorFormatState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  block: "P" | "H1" | "H2" | "H3" | "BLOCKQUOTE";
  alignment: "left" | "center" | "right" | "justify";
  list: "unordered" | "ordered" | null;
  fontFamily: string;
  fontSize: number;
};
