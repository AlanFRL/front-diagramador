// File: src\app\diagrams\diagram-list\diagram-list.component.ts
import { Component, OnInit } from '@angular/core';
import { DiagramService } from 'src/app/services/diagram.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-diagram-list',
  templateUrl: './diagram-list.component.html'
})
export class DiagramListComponent implements OnInit {
  diagrams: any[] = [
  ];
  diagramsAdmin: any[] = []; // Diagramas de administradores
  diagramsCollaborator: any[] = []; // Diagramas de colaboradores
  diagramName: string = '';
  roomCode: string = '';


  constructor(private diagramService: DiagramService, private router: Router) { }

  ngOnInit(): void {
    this.diagramService.getDiagramsByUserId().subscribe(
      (res: any) => {
        // Filtrar los diagramas por rol de admin y colaborador
      this.diagramsAdmin = res.filter((item: any) => item.role === 'admin').map((item: any) => item.diagram);
      this.diagramsCollaborator = res.filter((item: any) => item.role === 'colaborador').map((item: any) => item.diagram);
      },
      err => console.log(err)
    );
  }
  create() {
    if (this.diagramName.trim() === '') {
      // Si el campo está vacío, no hacer nada o mostrar un mensaje de error
      alert('El nombre del diagrama es obligatorio');
      return;
    }

    this.diagramService.createDiagram(this.diagramName)
   
      .subscribe(
        response => {
          console.log('Diagram created:', response);
          // Redirigir o cerrar el modal después de crear el diagrama
          this.router.navigate(['/diagrams/index']).then(() => {
            window.location.reload();  // Recarga la página
          });
        },
        error => {
          
          console.error('Error creating diagram:', error);
          // Manejar error
        }
      );
  }
  openDiagram(id: number) {
    this.diagramService.getDiagramById(id).subscribe(
      (data) => {
        console.log('Diagrama:', data); // Aquí puedes manejar el diagrama recibido
        const sala=data.roomCode;
        this.router.navigate(['/',sala], { state: { diagram: data } });
        // Lógica para mostrar el diagrama o cualquier otra acción que desees
      },
      (error) => {
        console.error('Error al obtener el diagrama:', error);
      }
    );
  }
  collaborate(){
    if (this.roomCode.trim() === '') {
      // Si el campo está vacío, no hacer nada o mostrar un mensaje de error
      alert('El nombre del diagrama es obligatorio');
      return;
    }

    this.diagramService.collaborateDiagram(this.roomCode)
   
      .subscribe(
        response => {
          console.log('Diagram created:', response);
          // Redirigir o cerrar el modal después de crear el diagrama
          this.router.navigate(['/diagrams/index']).then(() => {
            window.location.reload();  // Recarga la página
          }); // O ajusta según sea necesario
        },
        error => {
          
          console.error('Error creating diagram:', error);
          // Manejar error
        }
      );
  }
  deleteDiagram(id: number){
    console.log('deleted')
    console.log(id
    )
    this.diagramService.deleteDiagram(id).subscribe(
      response => {
        console.log('Diagram deleted:', response);
        // Redirigir o cerrar el modal después de crear el diagrama
        this.router.navigate(['/diagrams/index']).then(() => {
          window.location.reload();  // Recarga la página
        });
      },
      error => {
        
        console.error('Error deleting diagram:', error);
        // Manejar error
      }
    );
  }
}
