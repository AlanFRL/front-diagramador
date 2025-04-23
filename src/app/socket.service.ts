import { Injectable,EventEmitter } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | undefined;
 
  constructor() { }

  // Conectar al servidor socket y unirse a una sala
  connectToRoom(roomCode: string): void {
    // this.socket = io('https://serversocket-4e7a.onrender.com', {
    //   query: { nameRoom: roomCode }
    //https://serversocket-mjvx.onrender.com
    //http://localhost:5000
    //https://serversocket-mjvx.onrender.com
    // });

    
    this.socket = io('http://localhost:5000', {
      query: { nameRoom: roomCode }
    });
    
   /*
    this.socket = io('https://serversocket-mjvx.onrender.com', {
      query: { nameRoom: roomCode }
    });
    */
    
    // Mensaje de éxito de conexión
    this.socket.on('connect', () => {
      console.log('Conectado al servidor de sockets, en la sala: ' + roomCode);
    });
  }

  // Emitir evento a la sala
  sendEvent(eventName: string, data: any): void {
    if (this.socket) {
      this.socket.emit(eventName, data);
    }
  }

  // Escuchar eventos del servidor
  listenEvent(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      if (this.socket) {
        this.socket.on(eventName, (data: any) => {
          console.log(`Evento escuchado: ${eventName} - Data:`, data);
          subscriber.next(data);
        });
      }
    });
  }
  listenEvent2(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      if (this.socket) {
        this.socket.on(eventName, (data: any) => {
          console.log(`Evento escuchado: ${eventName} - Data:`, data);
          subscriber.next(data);
        });
      }
    });
  }

  // Desconectar del servidor
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('Desconectado del servidor de sockets');
    }
  }
}
