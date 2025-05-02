// File: src\app\services\auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  //private apiUrl = 'http://localhost:3000/auth';  // URL del backend
  private apiUrl = 'https://back-diagramador.onrender.com/auth';  // URL del backend


  constructor(private http: HttpClient, private router: Router) { }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { 
      "email": email, // Asegúrate de que los nombres de los campos coincidan
      "password":password
     });
  }

  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { name, email, password });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userName'); // 🔥 también borra el nombre guardado
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    console.log(token)
    const helper = new JwtHelperService();
    return !!token && !helper.isTokenExpired(token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserInfo(): any {
    const token = this.getToken();
    if (!token) return null;
  
    const helper = new JwtHelperService();
    const decodedToken = helper.decodeToken(token);
  
    return decodedToken;
  }
  
}
