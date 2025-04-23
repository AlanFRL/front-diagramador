import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DiagramService {
  //private apiUrl = 'https://api-diagramador-k9q5.onrender.com/diagrams';
  private apiUrl = 'http://localhost:3000/diagrams';
  //https://api-diagramador-k9q5.onrender.com
  //http://localhost:3000/diagrams

  constructor(private http: HttpClient) { }

  getAllDiagrams(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
  getDiagramsByUserId(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get/byId`);
  }
  getDiagramById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  createDiagram(name: string): Observable<any> {
    return this.http.post(this.apiUrl, { name });
  }

  updateDiagram(id: number, diagram: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, diagram);
  }

  deleteDiagram(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  collaborateDiagram(roomCode: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/collaborate`, { roomCode });
  }
}
