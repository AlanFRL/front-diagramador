import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RoomComponent } from './room/room.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { DiagramComponent } from 'gojs-angular';
import { AuthGuard } from './auth/auth.guard';
import { DiagramListComponent } from './diagrams/diagram-list/diagram-list.component';

const routes: Routes = [
  {
    path:'',
    component:LoginComponent
  },
  {
    path:':room',
    component:RoomComponent,
    canActivate: [AuthGuard]
  },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'diagrams/index', component: DiagramListComponent, canActivate: [AuthGuard] }
];



@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
