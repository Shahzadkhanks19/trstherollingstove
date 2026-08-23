declare module "qrcode" {
  type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

  type SvgOptions = {
    type: "svg";
    errorCorrectionLevel?: ErrorCorrectionLevel;
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  };


  type PngOptions = {
    type?: "png";
    errorCorrectionLevel?: ErrorCorrectionLevel;
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  };

  export function toBuffer(
    text: string,
    options?: PngOptions,
  ): Promise<Uint8Array>;

  export function toString(
    text: string,
    options: SvgOptions,
  ): Promise<string>;
}
