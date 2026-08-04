import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    _authSessionHandled?: boolean;
    _retry?: boolean;
    optionalAuthRequest?: boolean;
    skipAuthRefresh?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    _authSessionHandled?: boolean;
    _retry?: boolean;
    optionalAuthRequest?: boolean;
    skipAuthRefresh?: boolean;
  }
}
