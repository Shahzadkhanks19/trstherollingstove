export type SocialQrIconName =
  | "instagram"
  | "maps"
  | "reviews"
  | "whatsapp";

export interface SocialQrIconDefinition {
  readonly viewBoxSize: number;
  readonly svg: string;
}

const ICON_VIEW_BOX_SIZE = 24;

export const SOCIAL_QR_ICONS: Readonly<
  Record<SocialQrIconName, SocialQrIconDefinition>
> = {
  instagram: {
    viewBoxSize: ICON_VIEW_BOX_SIZE,
    svg: `
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#E1306C" stroke-width="2.25"/>
      <circle cx="12" cy="12" r="4.25" fill="none" stroke="#E1306C" stroke-width="2.25"/>
      <circle cx="17.45" cy="6.75" r="1.35" fill="#E1306C"/>
    `,
  },
  maps: {
    viewBoxSize: ICON_VIEW_BOX_SIZE,
    svg: `
      <path d="M12 22c1.75-2.19 6.5-8.3 6.5-13A6.5 6.5 0 1 0 5.5 9c0 4.7 4.75 10.81 6.5 13Z" fill="#EA4335"/>
      <path d="M12 2.5A6.5 6.5 0 0 0 5.5 9c0 1.67.6 3.52 1.45 5.28l5.05-5.05V2.5Z" fill="#4285F4"/>
      <path d="M18.5 9A6.5 6.5 0 0 0 12 2.5v6.73l4.92 4.92C17.84 12.32 18.5 10.5 18.5 9Z" fill="#34A853"/>
      <path d="m6.95 14.28 5.05-5.05 4.92 4.92A39.32 39.32 0 0 1 12 22a39.64 39.64 0 0 1-5.05-7.72Z" fill="#FBBC04"/>
      <circle cx="12" cy="9" r="2.7" fill="#FFFFFF"/>
    `,
  },
  reviews: {
    viewBoxSize: ICON_VIEW_BOX_SIZE,
    svg: `
      <circle cx="12" cy="12" r="10" fill="#F9AB00"/>
      <path d="m12 5.6 1.95 3.95 4.36.63-3.16 3.08.75 4.34L12 15.55 8.1 17.6l.75-4.34-3.16-3.08 4.36-.63L12 5.6Z" fill="#FFFFFF"/>
    `,
  },
  whatsapp: {
    viewBoxSize: ICON_VIEW_BOX_SIZE,
    svg: `
      <circle cx="12" cy="12" r="10" fill="#25D366"/>
      <path d="M17.42 6.58A7.62 7.62 0 0 0 5.4 15.76L4.35 19.6l3.94-1.03a7.6 7.6 0 0 0 3.64.93h.01a7.62 7.62 0 0 0 5.48-12.92Zm-5.48 11.63h-.01a6.32 6.32 0 0 1-3.22-.88l-.23-.14-2.34.61.62-2.28-.15-.24a6.33 6.33 0 1 1 5.33 2.93Z" fill="#FFFFFF"/>
      <path d="M15.42 13.48c-.19-.1-1.14-.56-1.32-.63-.18-.07-.31-.1-.44.1-.13.19-.5.63-.61.76-.11.13-.23.15-.42.05-.19-.1-.81-.3-1.54-.95-.57-.51-.96-1.14-1.07-1.33-.11-.19-.01-.3.08-.39.09-.09.19-.23.29-.34.1-.11.13-.19.19-.32.06-.13.03-.24-.02-.34-.05-.1-.44-1.06-.6-1.45-.16-.38-.32-.33-.44-.34h-.38c-.13 0-.34.05-.52.24-.18.19-.68.66-.68 1.61s.69 1.87.79 2c.1.13 1.36 2.08 3.29 2.91.46.2.82.32 1.1.41.46.15.88.13 1.21.08.37-.06 1.14-.47 1.3-.92.16-.45.16-.84.11-.92-.05-.08-.18-.13-.37-.23Z" fill="#FFFFFF"/>
    `,
  },
};
