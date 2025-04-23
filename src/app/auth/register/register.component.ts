import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';

  constructor(private authService: AuthService, private router: Router) { }

  register() {
    this.authService.register(this.name, this.email, this.password).subscribe(
      () => this.router.navigate(['/auth/login']),
      err => console.log(err)
    );
  }
}
