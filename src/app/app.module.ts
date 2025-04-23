import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './services/jwt-interceptor.service';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RoomComponent } from './room/room.component';
import { HomeComponent } from './home/home.component';
import { CookieService } from 'ngx-cookie-service';
import { BoardComponent } from './board/board.component';
import { ClassDiagramExportComponent } from './class-diagram-export/class-diagram-export.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { DiagramListComponent } from './diagrams/diagram-list/diagram-list.component';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from './navbar/navbar.component';
import { ClassDiagramImportComponent } from './class-diagram-import/class-diagram-import.component';
import { CodeGenerationComponent } from './code-generation/code-generation.component';


@NgModule({
  declarations: [
    AppComponent,
    RoomComponent,
    HomeComponent,
    BoardComponent,
    ClassDiagramExportComponent,
    LoginComponent,
    RegisterComponent,
    DiagramListComponent,
    NavbarComponent,
    ClassDiagramImportComponent,
    CodeGenerationComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [CookieService,{provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true}],
  bootstrap: [AppComponent]
})
export class AppModule { }
