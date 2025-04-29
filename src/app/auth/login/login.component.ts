import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    console.log('login');
    this.authService.login(this.email, this.password).subscribe(
      (res: any) => {
        //console.log(res)
        localStorage.setItem('token', res.token);
        // 🔥 Guardar también el name directamente
        const helper = new JwtHelperService();
        const decodedToken = helper.decodeToken(res.token);
        if (decodedToken) {
          localStorage.setItem(
            'userName',
            decodedToken.name || decodedToken.email || 'Usuario'
          );
        }
        this.router.navigate(['diagrams/index']);
        console.log(res);
      },
      (err) => {
        if (err.status === 400 || err.status === 401) {
          // Capturar el mensaje de error del servidor (asumiendo que viene en err.error.message)
          console.error('Error:', err.error.message);
          alert(`Error: ${err.error.message}`); // Mostrar el mensaje de error al usuario
        } else {
          console.error('Error inesperado:', err);
        }
      }
    );
  }
}
