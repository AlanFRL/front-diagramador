import { CookieService } from 'ngx-cookie-service';
import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import * as go from 'gojs';
import { SocketService } from '../socket.service';
import { DiagramService } from 'src/app/services/diagram.service';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css'],
})
export class BoardComponent implements AfterViewInit, OnInit, OnDestroy {
  roomCode: string = '';
  xmlDocument: string = '';
  jsonmodel: string = '';
  diagram: any;
  currentModel: any;
  title = 'diagram';
  public i = 15;
  public myDiagram?: go.Diagram;

  constructor(
    private socketService: SocketService,
    private cookieService: CookieService,
    private diagramService: DiagramService
  ) {}

  ngOnInit(): void {
    this.currentModel = { nodeDataArray: [], linkDataArray: [] };
    this.roomCode = this.cookieService.get('room') || '12345';
    this.socketService.connectToRoom(this.roomCode);

    if (history.state.diagram) {
      this.diagram = history.state.diagram;
      console.log('Diagrama:', this.diagram);
    }

    this.socketService.listenEvent('evento').subscribe((data) => {
      console.log('[Socket] Evento recibido:', data);
      const model = this.myDiagram!.model as go.GraphLinksModel;
      const { type, data: eventData } = data;

      switch (type) {
        case 'addClass':
          console.log('[Socket] Agregar nodo:', eventData);
          this.myDiagram!.startTransaction('addClass');
          model.addNodeData(eventData);
          this.myDiagram!.commitTransaction('addClass');
          break;

        case 'deletedClass':
          const nodeData = model.findNodeDataForKey(eventData.key);
          console.log('[Socket] Eliminar nodo con key:', eventData.key);
          if (nodeData) model.removeNodeData(nodeData);
          break;

        case 'editpropiedad':
          const nodeToUpdate = model.findNodeDataForKey(eventData.key);
          console.log('[Socket] Editar nodo:', eventData);
          if (nodeToUpdate) {
            this.myDiagram!.model.startTransaction('update node');
            for (const prop in eventData) {
              if (eventData.hasOwnProperty(prop)) {
                this.myDiagram!.model.setDataProperty(
                  nodeToUpdate,
                  prop,
                  eventData[prop]
                );
              }
            }
            this.myDiagram!.model.commitTransaction('update node');
          }
          break;

        case 'moveNodeLive':
          const nodeToMove = model.findNodeDataForKey(eventData.key);
          if (nodeToMove) {
            this.myDiagram!.model.startTransaction('move node');
            this.myDiagram!.model.setDataProperty(
              nodeToMove,
              'location',
              go.Point.stringify(
                new go.Point(eventData.position.x, eventData.position.y)
              )
            );
            this.myDiagram!.model.commitTransaction('move node');
          }
          break;
      }
    });
  }

  sendDiagramUpdate(data: any): void {
    console.log('[Socket] Enviando evento:', data);
    this.socketService.sendEvent('evento', data);
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  ngAfterViewInit() {
    this.myDiagram = new go.Diagram('myDiagramDiv', {
      'undoManager.isEnabled': true,
      layout: new go.Layout({}),
    });

    this.myDiagram.addModelChangedListener((e) => {
      if (
        e.change === go.ChangedEvent.Remove &&
        e.modelChange === 'nodeDataArray'
      ) {
        console.log('[Model] Nodo eliminado:', e.oldValue);
        this.sendDiagramUpdate({ type: 'deletedClass', data: e.oldValue });
      }
    });

    this.myDiagram.addDiagramListener('TextEdited', (e) => {
      const editedPart = e.subject.part;
      if (editedPart instanceof go.Node) {
        console.log('[Diagram] Nodo editado:', editedPart.data);
        this.sendDiagramUpdate({
          type: 'editpropiedad',
          data: editedPart.data,
        });
      }
    });

    this.myDiagram.addDiagramListener('SelectionMoved', (e) => {
      e.diagram.selection.each((part) => {
        if (part instanceof go.Node) {
          const position = part.location;
          console.log('[Diagram] Nodo movido:', part.data.key, position);
          this.sendDiagramUpdate({
            type: 'moveNodeLive',
            data: {
              key: part.data.key,
              position: { x: position.x, y: position.y },
            },
          });
        }
      });
    });

    this.myDiagram.groupTemplateMap.add(
      'Frame',
      go.GraphObject.make(
        go.Group,
        'Auto',
        {
          resizable: false,
          layout: null,
          computesBoundsAfterDrag: true,
          handlesDragDropForMembers: true,
          memberValidation: (_grp: go.Group, part: go.Part) => part instanceof go.Node,
          //mouseDragEnter: (e, grp, prev) => { grp.isHighlighted = true; },
          //mouseDragLeave: (e, grp, next) => { grp.isHighlighted = false; },
          mouseDrop: (e, grp) => {
            const diagram = grp.diagram;
            if (!diagram) return;
            const selectedParts = diagram.selection;
            if (grp instanceof go.Group) {
              const ok = grp.addMembers(selectedParts, true);
              if (!ok) diagram.currentTool.doCancel();
            }
          },
          locationSpot: go.Spot.Center,
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        go.GraphObject.make(go.Shape, {
          fill: '#fffbe6',
          stroke: '#999',
          strokeWidth: 2,
          width: 800,
          height: 500,
        }),
        go.GraphObject.make(go.TextBlock, {
          alignment: go.Spot.TopLeft,
          margin: 10,
          font: 'bold 14pt sans-serif',
          editable: true,
        }).bindTwoWay('text')
      )
    );

    this.myDiagram.nodeTemplateMap.add(
      'Button',
      go.GraphObject.make(
        go.Node,
        'Auto',
        {
          locationSpot: go.Spot.Center,
          fromSpot: go.Spot.AllSides,
          toSpot: go.Spot.AllSides,
          cursor: 'pointer',
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        go.GraphObject.make(go.Shape, { fill: '#cce5ff', stroke: '#333' }),
        go.GraphObject.make(go.TextBlock, {
          margin: 8,
          editable: true,
          font: 'bold 12pt sans-serif',
        }).bindTwoWay('text', 'label')
      )
    );

    this.myDiagram.nodeTemplateMap.add(
      'Input',
      go.GraphObject.make(
        go.Node,
        'Auto',
        {
          locationSpot: go.Spot.Center,
          fromSpot: go.Spot.AllSides,
          toSpot: go.Spot.AllSides,
          cursor: 'pointer',
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        go.GraphObject.make(go.Shape, { fill: '#f9f9f9', stroke: '#333' }),
        go.GraphObject.make(go.Panel, 'Vertical').add(
          go.GraphObject.make(go.TextBlock, {
            margin: new go.Margin(5, 10, 2, 10),
            editable: true,
            font: '12pt sans-serif',
          }).bindTwoWay('text', 'placeholder'),
          go.GraphObject.make(go.TextBlock, {
            font: 'italic 10pt sans-serif',
            margin: new go.Margin(0, 10, 5, 10),
            stroke: '#666',
          }).bindTwoWay('text', 'name')
        )
      )
    );

    if (this.diagram?.model) {
      const model = this.diagram.model;
      console.log('[Init] Cargando modelo desde history.state:', model);
      model.nodeDataArray.forEach((node: any) => {
        if (node.position) {
          node.location = node.position;
          delete node.position;
        }
      });
      this.myDiagram.model = new go.GraphLinksModel({
        copiesArrays: true,
        copiesArrayObjects: true,
        nodeDataArray: model.nodeDataArray,
        linkDataArray: [],
      });
    } else {
      console.log('[Init] Inicializando modelo vacío');
      this.myDiagram.model = new go.GraphLinksModel({
        copiesArrays: true,
        copiesArrayObjects: true,
        nodeDataArray: [],
        linkDataArray: [],
      });
    }
  }

  setClass(type: string) {
    this.i++;
    let newNode: any = {
      key: this.i,
      category: type,
      location: '0 0',
    };

    if (type === 'Button') {
      newNode.label = 'Enviar';
      newNode.onClick = 'handleSubmit()';
    } else if (type === 'Input') {
      newNode.placeholder = 'Escribe aquí';
      newNode.name = 'campo';
      newNode.binding = 'modelo.campo';
    } else if (type === 'Frame') {
      newNode.isGroup = true;
      newNode.category = 'Frame';
      newNode.text = 'Vista nueva';
    }

    console.log('[AddNode] Nuevo nodo creado:', newNode);
    const model = this.myDiagram!.model as go.GraphLinksModel;
    this.myDiagram!.startTransaction('addClass');
    model.addNodeData(newNode);
    this.myDiagram!.commitTransaction('addClass');
    this.sendDiagramUpdate({ type: 'addClass', data: newNode });
  }

  deleteNode(nodeData: any) {
    this.myDiagram!.startTransaction('delete node');
    this.myDiagram!.model.removeNodeData(nodeData);
    this.myDiagram!.commitTransaction('delete node');
    console.log('[DeleteNode] Nodo eliminado:', nodeData);
  }

  coordenadas() {
    const jsonModel = this.myDiagram!.model.toJson();
    console.log('[Coordenadas] Modelo generado:', JSON.parse(jsonModel));
    this.xmlDocument = JSON.parse(jsonModel);
    this.jsonmodel = jsonModel;
    this.diagram.model = JSON.parse(jsonModel);
  }

  saveDiagram() {
    this.coordenadas();
    this.diagramService.updateDiagram(this.diagram.id, this.diagram).subscribe(
      () => alert('Diagrama Guardado'),
      (error) => console.error('Error updating diagram:', error)
    );
  }

  onModelChange(model: any) {
    console.log('[ModelChange] Modelo importado:', model);
    this.currentModel = {
      nodeDataArray: model.nodeDataArray,
      linkDataArray: [],
    };
    this.myDiagram!.model = new go.GraphLinksModel({
      copiesArrays: true,
      copiesArrayObjects: true,
      nodeDataArray: model.nodeDataArray,
      linkDataArray: [],
    });
  }
}
