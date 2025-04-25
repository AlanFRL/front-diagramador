// File: src\app\navbar\navbar.component.ts
import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { DiagramService } from '../services/diagram.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  constructor(private authService: AuthService, private router: Router) { }

  logout() {
    this.authService.logout()
  }
  diagramalist(){
    this.router.navigate(['diagrams/index']);
  }
}
