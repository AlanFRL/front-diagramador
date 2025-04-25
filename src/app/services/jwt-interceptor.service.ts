// File: src\app\services\jwt-interceptor.service.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.authService.getToken(); // Recupera el token JWT almacenado.
    if (token) {
      // Clona la solicitud y añade el token en el encabezado Authorization.
      const clonedReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(clonedReq);
    }
    // Si no hay token, envía la solicitud sin modificarla.
    return next.handle(req);
  }
}
