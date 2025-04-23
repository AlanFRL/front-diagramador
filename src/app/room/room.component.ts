import { CookieService } from 'ngx-cookie-service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit {
 room?:string
  constructor(private router:ActivatedRoute, private cookieService:CookieService){

 }
 ngOnInit(): void {
     this.room = this.router.snapshot.paramMap.get('room')|| '123'
    //  console.log(this.room)
     this.cookieService.set('room', this.room);
 }
}
