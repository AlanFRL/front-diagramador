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
  public isApplyingRemoteChanges: boolean = false;
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

            // Si es un grupo, actualizamos también sus miembros
            if (eventData.members) {
              eventData.members.forEach((member: any) => {
                const memberNode = model.findNodeDataForKey(member.key);
                if (memberNode) {
                  this.myDiagram!.model.setDataProperty(
                    memberNode,
                    'location',
                    go.Point.stringify(
                      new go.Point(member.position.x, member.position.y)
                    )
                  );
                }
              });
            }

            this.myDiagram!.model.commitTransaction('move node');
          }
          break;

        case 'addLink':
          this.isApplyingRemoteChanges = true;
          console.log('[Socket] Agregar enlace:', eventData);
          this.myDiagram!.startTransaction('addLink');
          model.addLinkData(eventData);
          this.myDiagram!.commitTransaction('addLink');
          this.isApplyingRemoteChanges = false;
          break;

        case 'deletedLink':
          console.log('[Socket] Eliminar enlace:', eventData);
          const linkToDelete = model.linkDataArray.find(
            (l: any) => l.key === eventData.key
          );
          if (linkToDelete) {
            this.myDiagram!.startTransaction('delete link');
            model.removeLinkData(linkToDelete);
            this.myDiagram!.commitTransaction('delete link');
          }
          break;

          case 'resizeNode':
            const resizedNode = model.findNodeDataForKey(eventData.key);
            if (resizedNode) {
              this.myDiagram!.model.startTransaction('resize node');
              this.myDiagram!.model.setDataProperty(
                resizedNode,
                'size',
                eventData.size
              );
              if (eventData.position) { // <--- Agregado
                this.myDiagram!.model.setDataProperty(
                  resizedNode,
                  'location',
                  go.Point.stringify(new go.Point(eventData.position.x, eventData.position.y))
                );
              }
              if (eventData.members) {
                eventData.members.forEach((member: any) => {
                  const memberNode = model.findNodeDataForKey(member.key);
                  if (memberNode) {
                    this.myDiagram!.model.setDataProperty(
                      memberNode,
                      'location',
                      go.Point.stringify(
                        new go.Point(member.position.x, member.position.y)
                      )
                    );
                  }
                });
              }
              this.myDiagram!.model.commitTransaction('resize node');
            }
            break;
          

        case 'groupMembers':
          const group = this.myDiagram!.findNodeForKey(eventData.groupKey);
          if (group instanceof go.Group) {
            this.myDiagram!.startTransaction('group members');
            const members: go.Node[] = [];
            eventData.memberKeys.forEach((key: any) => {
              const member = this.myDiagram!.findNodeForKey(key);
              if (member instanceof go.Node) {
                members.push(member);
              }
            });
            group.addMembers(new go.List<go.Part>().addAll(members), true);
            this.myDiagram!.commitTransaction('group members');
          }
          break;
      }
    });
  }

  sendDiagramUpdate(data: any): void {
    console.log('[Socket] Enviando evento:', data);
    this.socketService.sendEvent('evento', data);
  }
  

  finishDrop(e: go.DiagramEvent, grp: go.Group | null) {
    const diagram = e.diagram;
    const selection = diagram.selection;
    let ok = false;

    if (grp !== null) {
      ok = grp.addMembers(
        new go.List<go.Part>().addAll(selection.toArray()),
        true
      );
    } else {
      ok = diagram.commandHandler.addTopLevelParts(selection, true);
    }

    if (ok && grp !== null) {
      const memberKeys: number[] = [];
      selection.each((part) => {
        if (part instanceof go.Node) {
          memberKeys.push(part.data.key);
        }
      });

      console.log(
        '[Diagram] Agrupando elementos en grupo',
        grp.data.key,
        memberKeys
      );
      this.sendDiagramUpdate({
        type: 'groupMembers',
        data: {
          groupKey: grp.data.key,
          memberKeys: memberKeys,
        },
      });
    }

    if (!ok) {
      diagram.currentTool.doCancel();
    }
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  ngAfterViewInit() {
    this.myDiagram = new go.Diagram('myDiagramDiv', {
      'undoManager.isEnabled': true,
      layout: new go.Layout({}),
      mouseDrop: (e: go.DiagramEvent) => this.finishDrop(e, null),
    });

    this.myDiagram.toolManager.linkingTool.isEnabled = false;
    this.myDiagram.toolManager.relinkingTool.isEnabled = false;

    this.myDiagram.addDiagramListener('LinkDrawn', (e: go.DiagramEvent) => {
      console.log('[LinkDrawn] Enlace creado exitosamente');
      this.cancelLinkMode();
    });

    this.myDiagram.addModelChangedListener((e) => {
      if (this.isApplyingRemoteChanges) return;
      if (
        e.change === go.ChangedEvent.Remove &&
        e.modelChange === 'nodeDataArray'
      ) {
        console.log('[Model] Nodo eliminado:', e.oldValue);
        this.sendDiagramUpdate({ type: 'deletedClass', data: e.oldValue });
      }

      if (
        e.change === go.ChangedEvent.Insert &&
        e.modelChange === 'linkDataArray'
      ) {
        console.log('[Model] Enlace creado:', e.newValue);
        this.sendDiagramUpdate({ type: 'addLink', data: e.newValue });
      }

      if (
        e.change === go.ChangedEvent.Remove &&
        e.modelChange === 'linkDataArray'
      ) {
        console.log('[Model] Enlace eliminado:', e.oldValue);
        this.sendDiagramUpdate({ type: 'deletedLink', data: e.oldValue });
      }
    });

    this.myDiagram.addDiagramListener('TextEdited', (e: go.DiagramEvent) => {
      const tb = e.subject as go.TextBlock;
      if (!tb) return;

      if (!tb.text || tb.text.trim() === '') {
        const oldText = e.parameter as string;
        tb.text = oldText;
        alert('No se puede dejar vacío.');
        return;
      }

      const editedPart = tb.part;
      if (!(editedPart instanceof go.Node) && !(editedPart instanceof go.Group))
        return;

      let propName = 'text';
      const category = editedPart.data.category;
      const tbName = tb.name;

      console.log('[Diagram] Editando nodo categoría:', category);

      if (category === 'Button') {
        propName = 'label';
      } else if (category === 'Input') {
        if (tbName === 'placeholder') {
          propName = 'placeholder';
        } else if (tbName === 'name') {
          propName = 'name';
        }
      } else if (category === 'Attribute') {
        if (tbName === 'label') {
          propName = 'label';
        } else if (tbName === 'name') {
          propName = 'name';
        } else if (tbName === 'type') {
          propName = 'type';
        }
      } else if (category === 'List') {
        if (tbName === 'text') {
          propName = 'text';
        } else if (tbName === 'modelName') {
          propName = 'modelName';
        }
      } else if (category === 'Link') {
        if (tbName === 'text') {
          propName = 'text';
        } else if (tbName === 'routerLink') {
          propName = 'routerLink';
        }
      } else if (category === 'Sidebar') {
        if (tbName === 'title') {
          propName = 'title';
        } else if (tbName === 'optionsText') {
          propName = 'optionsText';
        }
      } else if (
        category === 'Frame' ||
        category === 'Form' ||
        category === 'Card' ||
        category === 'Navbar' ||
        category === 'Crud' ||
        category === 'Label'
      ) {
        propName = 'text';
      }

      console.log('[Diagram] Texto editado:', tb.text);
      console.log('[Diagram] Propiedad realmente detectada:', propName);

      this.myDiagram!.model.startTransaction('update text');
      this.myDiagram!.model.setDataProperty(editedPart.data, propName, tb.text);
      this.myDiagram!.model.commitTransaction('update text');

      this.sendDiagramUpdate({
        type: 'editpropiedad',
        data: {
          key: editedPart.data.key,
          [propName]: tb.text,
        },
      });
    });

    this.myDiagram.addDiagramListener(
      'SelectionMoved',
      (e: go.DiagramEvent) => {
        e.diagram.selection.each((part) => {
          if (part instanceof go.Node || part instanceof go.Group) {
            const position = part.location;
            console.log(
              '[Diagram] Nodo/Grupo movido:',
              part.data.key,
              position
            );

            const members: any[] = [];

            function collectMembers(group: go.Group) {
              group.memberParts.each((member) => {
                if (member instanceof go.Node || member instanceof go.Group) {
                  members.push({
                    key: member.data.key,
                    position: {
                      x: member.location.x,
                      y: member.location.y,
                    },
                  });
                  if (member instanceof go.Group) {
                    collectMembers(member); // 📢 recursivamente recolectar hijos de hijos
                  }
                }
              });
            }

            if (part instanceof go.Group) {
              collectMembers(part);
            }

            this.sendDiagramUpdate({
              type: 'moveNodeLive',
              data: {
                key: part.data.key,
                position: { x: position.x, y: position.y },
                members: members,
              },
            });
          }
        });
      }
    );

    this.myDiagram.addDiagramListener('PartResized', (e: go.DiagramEvent) => {
      const part = e.subject.part;
      if (part instanceof go.Node || part instanceof go.Group) {
        const size = part.actualBounds.size;
        const position = part.location; // <--- Agregado capturar la posición
        console.log('[Diagram] Nodo redimensionado:', part.data.key, size, position);
    
        const members: any[] = [];
    
        function collectMembers(group: go.Group) {
          group.memberParts.each((member) => {
            if (member instanceof go.Node || member instanceof go.Group) {
              members.push({
                key: member.data.key,
                position: {
                  x: member.location.x,
                  y: member.location.y,
                },
              });
              if (member instanceof go.Group) {
                collectMembers(member); // 🔥 Recolectar recursivamente
              }
            }
          });
        }
    
        if (part instanceof go.Group) {
          collectMembers(part);
        }
    
        this.sendDiagramUpdate({
          type: 'resizeNode',
          data: {
            key: part.data.key,
            size: `${size.width} ${size.height}`,
            position: { x: position.x, y: position.y }, // <--- Agregado enviar location
            members: members, // 🔥
          },
        });
      }
    });
    

    this.myDiagram.groupTemplateMap.add(
      'Frame',
      go.GraphObject.make(
        go.Group,
        'Auto',
        {
          resizable: true,
          layout: null,
          computesBoundsAfterDrag: true,
          handlesDragDropForMembers: true,
          memberValidation: (_grp: go.Group, part: go.Part) =>
            part instanceof go.Node,
          toLinkable: true,
          fromLinkable: false,
          toSpot: go.Spot.Top,

          mouseDragEnter: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.fill = '#fceabb';
          },
          mouseDragLeave: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.fill = '#fffbe6';
          },
          mouseDrop: (e, grp) => {
            if (grp instanceof go.Group) {
              this.finishDrop(e as unknown as go.DiagramEvent, grp);
            }
          },
          locationSpot: go.Spot.Center,
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(
          go.Size.stringify
        ),
        go.GraphObject.make(go.Shape, {
          name: 'SHAPE',
          fill: '#fffbe6',
          stroke: '#999',
          strokeWidth: 2,
        }),
        go.GraphObject.make(
          go.Panel,
          'Horizontal',
          { alignment: go.Spot.TopLeft, margin: 8 },
          go.GraphObject.make(go.Picture, {
            source: 'assets/images/page-svgrepo-com.svg',
            desiredSize: new go.Size(20, 20),
            margin: new go.Margin(0, 6, 0, 0),
          }),
          go.GraphObject.make(go.TextBlock, {
            font: 'bold 14pt sans-serif',
            editable: true,
          }).bindTwoWay('text')
        )
      )
    );

    this.myDiagram.groupTemplateMap.add(
      'Form',
      go.GraphObject.make(
        go.Group,
        'Auto',
        {
          resizable: true,
          layout: null,
          computesBoundsAfterDrag: true,
          handlesDragDropForMembers: true,
          memberValidation: (_grp: go.Group, part: go.Part) =>
            part instanceof go.Node,
          mouseDragEnter: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.fill = '#d0f0ff';
          },
          mouseDragLeave: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.fill = '#f1f1f1';
          },
          mouseDrop: (e, grp) => {
            if (grp instanceof go.Group) {
              this.finishDrop(e as unknown as go.DiagramEvent, grp);
            }
          },
          locationSpot: go.Spot.Center,
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(
          go.Size.stringify
        ),
        go.GraphObject.make(go.Shape, {
          name: 'SHAPE',
          fill: '#f1f1f1',
          stroke: '#666',
          strokeWidth: 2,
        }),
        go.GraphObject.make(
          go.Panel,
          'Horizontal',
          { alignment: go.Spot.TopLeft, margin: 8 },
          go.GraphObject.make(go.Picture, {
            source: 'assets/images/form-svgrepo-com.svg',
            desiredSize: new go.Size(20, 20),
            margin: new go.Margin(0, 6, 0, 0),
          }),
          go.GraphObject.make(go.TextBlock, {
            font: 'bold 13pt sans-serif',
            editable: true,
          }).bindTwoWay('text')
        )
      )
    );

    this.myDiagram.nodeTemplateMap.add(
      'Button',
      go.GraphObject.make(
        go.Node,
        'Auto',
        {
          locationSpot: go.Spot.Center,
          fromLinkable: true,
          toLinkable: false,
          fromSpot: go.Spot.Right,
          cursor: 'pointer',
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        go.GraphObject.make(go.Shape, { fill: '#cce5ff', stroke: '#333' }),
        go.GraphObject.make(
          go.Panel,
          'Horizontal',
          { margin: 8 },
          go.GraphObject.make(go.Picture, {
            source: 'assets/images/button-choice-svgrepo-com.svg',
            desiredSize: new go.Size(20, 20),
            margin: new go.Margin(0, 6, 0, 0),
          }),
          go.GraphObject.make(go.TextBlock, {
            editable: true,
            font: 'bold 12pt sans-serif',
          }).bindTwoWay('text', 'label')
        )
      )
    );

    this.myDiagram.linkTemplate = go.GraphObject.make(
      go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 10,
        relinkableFrom: false,
        relinkableTo: false,
        reshapable: false,
        resegmentable: false,
        selectable: true,
        layerName: 'Foreground',
      },
      go.GraphObject.make(go.Shape, {
        stroke: '#2196f3',
        strokeWidth: 2,
      }),
      go.GraphObject.make(go.Shape, {
        toArrow: 'Standard',
        fill: '#2196f3',
        stroke: null,
      })
    );

    this.myDiagram.nodeTemplateMap.add(
      'LinkToFrame',
      go.GraphObject.make(
        go.Node,
        'Auto',
        {
          locationSpot: go.Spot.Center,
          cursor: 'pointer',
          fromLinkable: true,
          toLinkable: false,
          fromSpot: go.Spot.Right,
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        go.GraphObject.make(go.Shape, {
          fill: '#e8f0fe',
          stroke: '#1a73e8',
          strokeWidth: 1.5,
          figure: 'RoundedRectangle',
        }),
        go.GraphObject.make(
          go.Panel,
          'Horizontal',
          { margin: 6 },
          go.GraphObject.make(go.Picture, {
            source: 'assets/images/link.svg',
            desiredSize: new go.Size(18, 18),
            margin: new go.Margin(0, 4, 0, 0),
          }),
          go.GraphObject.make(go.TextBlock, {
            editable: true,
            font: 'bold 11pt sans-serif',
          }).bindTwoWay('text')
        )
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
        go.GraphObject.make(
          go.Panel,
          'Vertical',
          go.GraphObject.make(
            go.Panel,
            'Horizontal',
            {
              defaultAlignment: go.Spot.Center,
              margin: new go.Margin(5, 10, 2, 10),
            },
            go.GraphObject.make(
              go.Picture,
              {
                desiredSize: new go.Size(16, 16),
                margin: new go.Margin(0, 4, 0, 0),
              },
              new go.Binding(
                'source',
                'inputType',
                (t) => `assets/images/input-${t || 'text'}.svg`
              )
            ),
            go.GraphObject.make(
              go.TextBlock,
              {
                editable: true,
                font: '12pt sans-serif',
                name: 'placeholder',
              },
              new go.Binding('text', 'placeholder').makeTwoWay()
            )
          ),
          go.GraphObject.make(
            go.Panel,
            'Horizontal',
            { defaultAlignment: go.Spot.Center },
            go.GraphObject.make(
              go.TextBlock,
              {
                editable: true,
                font: 'italic 10pt sans-serif',
                stroke: '#666',
                margin: new go.Margin(0, 4, 5, 10),
                name: 'name',
              },
              new go.Binding('text', 'name').makeTwoWay()
            ),
            go.GraphObject.make(
              go.TextBlock,
              {
                font: '10pt sans-serif',
                stroke: '#888',
                margin: new go.Margin(0, 10, 5, 4),
              },
              new go.Binding('text', 'inputType').makeTwoWay()
            )
          )
        )
      )
    );

    this.myDiagram.groupTemplateMap.add(
      'Sidebar',
      go.GraphObject.make(
        go.Group,
        'Auto',
        {
          resizable: true,
          layout: null, // 🔥 NO HAY LAYOUT, igual que Navbar
          computesBoundsAfterDrag: true,
          handlesDragDropForMembers: true,
          memberValidation: (_grp: go.Group, part: go.Part) =>
            part.data.category === 'Link', // Solo Links adentro
          mouseDragEnter: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.stroke = '#00BCD4'; // Highlight al entrar
          },
          mouseDragLeave: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.stroke = '#999'; // Normal al salir
          },
          mouseDrop: (e, grp) => {
            if (grp instanceof go.Group) {
              this.finishDrop(e as unknown as go.DiagramEvent, grp);
            }
          },
          locationSpot: go.Spot.Center,
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(
          go.Size.stringify
        ),
        go.GraphObject.make(go.Shape, 'Rectangle', {
          name: 'SHAPE',
          fill: '#f4f6f8', // Fondo clarito tipo sidebar
          stroke: '#999',
          strokeWidth: 2,
        }),
        go.GraphObject.make(
          go.Panel,
          'Vertical',
          { alignment: go.Spot.TopLeft, margin: 8 },
          go.GraphObject.make(
            go.Panel,
            'Horizontal',
            { alignment: go.Spot.Left },
            go.GraphObject.make(go.Picture, {
              source: 'assets/images/sidebar.svg', // Ícono correcto
              desiredSize: new go.Size(20, 20),
              margin: new go.Margin(0, 6, 0, 0),
            }),
            go.GraphObject.make(go.TextBlock, {
              font: 'bold 14pt sans-serif',
              editable: true,
              margin: new go.Margin(0, 6, 0, 6),
            }).bindTwoWay('text')
          ),
        )
      )
    );
    

    this.myDiagram.nodeTemplateMap.add(
      'Label',
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
        go.GraphObject.make(
          go.Panel,
          'Horizontal',
          { margin: 6 },
          go.GraphObject.make(go.Picture, {
            desiredSize: new go.Size(16, 16),
            source: 'assets/images/label.svg',
            margin: new go.Margin(0, 4, 0, 0),
          }),
          go.GraphObject.make(
            go.TextBlock,
            {
              editable: true,
              font: 'bold 12pt sans-serif',
            },
            new go.Binding('text', 'text').makeTwoWay()
          )
        )
      )
    );

    this.myDiagram.groupTemplateMap.add(
      'Navbar',
      go.GraphObject.make(
        go.Group,
        'Auto', // <- igual que Frame, Form y Card
        {
          resizable: true,
          layout: null, // <- SIN layout automático
          computesBoundsAfterDrag: true,
          handlesDragDropForMembers: true,
          memberValidation: (_grp: go.Group, part: go.Part) =>
            part.data.category === 'Link',
          mouseDragEnter: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.stroke = '#00BCD4'; // Highlight al entrar
          },
          mouseDragLeave: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.stroke = '#999'; // Normal al salir
          },
          mouseDrop: (e, grp) => {
            if (grp instanceof go.Group) {
              this.finishDrop(e as unknown as go.DiagramEvent, grp);
            }
          },

          locationSpot: go.Spot.Center,
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(
          go.Size.stringify
        ),

        go.GraphObject.make(go.Shape, 'Rectangle', {
          name: 'SHAPE',
          fill: '#e0f7fa', // color azul claro típico de navbars
          stroke: '#999',
          strokeWidth: 2,
        }),

        go.GraphObject.make(
          go.Panel,
          'Vertical',
          { alignment: go.Spot.TopLeft, margin: 8 },

          go.GraphObject.make(
            go.Panel,
            'Horizontal',
            { alignment: go.Spot.Left },
            go.GraphObject.make(go.Picture, {
              source: 'assets/images/navbar.svg', // ícono de navbar
              desiredSize: new go.Size(20, 20),
              margin: new go.Margin(0, 6, 0, 0),
            }),
            go.GraphObject.make(go.TextBlock, {
              font: 'bold 14pt sans-serif',
              editable: true,
              margin: new go.Margin(0, 6, 0, 6),
            }).bindTwoWay('text')
          )
        )
      )
    );

    this.myDiagram.nodeTemplateMap.add(
      'Link',
      go.GraphObject.make(
        go.Node,
        'Auto',
        {
          locationSpot: go.Spot.Center,
          fromLinkable: true,
          toLinkable: false,
          cursor: 'pointer',
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(go.Point.stringify),
        go.GraphObject.make(
          go.Shape,
          {
            fill: '#ffffff',
            stroke: '#2196f3',
            strokeWidth: 1.5,
            figure: 'RoundedRectangle',
          }
        ),
        go.GraphObject.make(
          go.Panel,
          'Horizontal',
          { margin: 6 },
          // Ícono
          go.GraphObject.make(
            go.Picture,
            {
              source: 'assets/images/link.svg', // Ícono azul de enlace
              width: 20,
              height: 20,
              margin: new go.Margin(0, 4, 0, 0)
            }
          ),
          // Panel de Textos
          go.GraphObject.make(
            go.Panel,
            'Vertical',
            { alignment: go.Spot.Left },
            // Texto principal (text)
            go.GraphObject.make(
              go.TextBlock,
              {
                editable: true,
                font: 'bold 12pt sans-serif',
                stroke: '#2196f3',
                name: 'text',
              },
              new go.Binding('text').makeTwoWay()
            ),
            // Texto secundario (routerLink)
            go.GraphObject.make(
              go.TextBlock,
              {
                editable: true,
                font: 'italic 9pt sans-serif',
                stroke: '#757575',
                name: 'routerLink',
                margin: new go.Margin(2, 0, 0, 0),
              },
              new go.Binding('text', 'routerLink').makeTwoWay()
            )
          )
        )
      )
    );
    

    this.myDiagram.groupTemplateMap.add(
      'List',
      go.GraphObject.make(
        go.Group,
        'Auto',
        {
          resizable: true,
          layout: null,
          computesBoundsAfterDrag: true,
          handlesDragDropForMembers: true,
          locationSpot: go.Spot.Center,
          //memberValidation: (_grp: go.Group, part: go.Part) => part.data.category === 'Attribute',
          memberValidation: (_grp: go.Group, part: go.Part) => 
            part.data.category === 'Attribute' || part.data.category === 'CrudButton',
          
          fromLinkable: true,
          toLinkable: true,
          cursor: 'pointer',
          mouseDragEnter: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.stroke = '#00BCD4';
          },
          mouseDragLeave: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.stroke = '#999';
          },
          mouseDrop: (e, grp) => {
            if (grp instanceof go.Group) {
              this.finishDrop(e as unknown as go.DiagramEvent, grp);
            }
          }
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(go.Point.stringify),
        new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify),
        go.GraphObject.make(
          go.Shape,
          {
            name: 'SHAPE',
            fill: '#ffffff',
            stroke: '#999',
            strokeWidth: 1.5,
          }
        ),
        go.GraphObject.make(
          go.Panel,
          'Vertical',
          { alignment: go.Spot.TopLeft, margin: 8 },
          go.GraphObject.make(
            go.Panel,
            'Horizontal',
            { alignment: go.Spot.Left },
            go.GraphObject.make(go.Picture, {
              source: 'assets/images/table.svg',
              desiredSize: new go.Size(20, 20),
              margin: new go.Margin(0, 4, 0, 0),
            }),
            go.GraphObject.make(
              go.TextBlock,
              {
                editable: true,
                font: 'bold 13pt sans-serif',
                margin: new go.Margin(0, 6, 0, 6),
                name: 'text'
              },
              new go.Binding('text', 'text').makeTwoWay()
            )
          ),
          go.GraphObject.make(
            go.TextBlock,
            {
              editable: true,
              font: 'italic 10pt sans-serif',
              stroke: '#888',
              margin: new go.Margin(2, 8, 0, 28), // Pequeño margen para separarlo
              name: 'modelName'
            },
            new go.Binding('text', 'modelName').makeTwoWay()
          ),
        )
      )
    );
    
    
    

    this.myDiagram.groupTemplateMap.add(
      'Card',
      go.GraphObject.make(
        go.Group,
        'Auto',
        {
          resizable: true,
          layout: null,
          computesBoundsAfterDrag: true,
          handlesDragDropForMembers: true,
          memberValidation: (_grp: go.Group, part: go.Part) =>
            part instanceof go.Node,
          mouseDragEnter: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.stroke = '#2196f3';
          },
          mouseDragLeave: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.stroke = '#999';
          },
          mouseDrop: (e, grp) => {
            if (grp instanceof go.Group) {
              this.finishDrop(e as unknown as go.DiagramEvent, grp);
            }
          },

          locationSpot: go.Spot.Center,
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(
          go.Size.stringify
        ),
        go.GraphObject.make(go.Shape, 'RoundedRectangle', {
          name: 'SHAPE',
          fill: '#ffffff',
          stroke: '#999',
          strokeWidth: 2,
          parameter1: 10,
        }),
        go.GraphObject.make(
          go.Panel,
          'Vertical',
          { alignment: go.Spot.TopLeft, margin: 8 },
          go.GraphObject.make(
            go.Panel,
            'Horizontal',
            { alignment: go.Spot.Left },
            go.GraphObject.make(go.Picture, {
              source: 'assets/images/card.svg',
              desiredSize: new go.Size(20, 20),
              margin: new go.Margin(0, 6, 0, 0),
            }),
            go.GraphObject.make(go.TextBlock, {
              font: 'bold 14pt sans-serif',
              editable: true,
              margin: new go.Margin(0, 6, 0, 6),
            }).bindTwoWay('text')
          )
        )
      )
    );

    this.myDiagram.groupTemplateMap.add(
      'Crud',
      go.GraphObject.make(
        go.Group,
        'Auto',
        {
          resizable: true,
          layout: null,
          computesBoundsAfterDrag: true,
          handlesDragDropForMembers: true,
          memberValidation: (_grp: go.Group, part: go.Part) =>
            part instanceof go.Node,
          toLinkable: true,
          fromLinkable: false,
          toSpot: go.Spot.Top,
    
          mouseDragEnter: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.fill = '#dff0d8'; // Verde clarito al entrar
          },
          mouseDragLeave: (e, grp) => {
            const shape = (grp as go.Group).findObject('SHAPE') as go.Shape;
            if (shape) shape.fill = '#f0fff0'; // Verde clarito base
          },
          mouseDrop: (e, grp) => {
            if (grp instanceof go.Group) {
              this.finishDrop(e as unknown as go.DiagramEvent, grp);
            }
          },
          locationSpot: go.Spot.Center,
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(
          go.Point.stringify
        ),
        new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(
          go.Size.stringify
        ),
        go.GraphObject.make(go.Shape, {
          name: 'SHAPE',
          fill: '#f0fff0', // Verde muy clarito para diferenciarlo
          stroke: '#999',
          strokeWidth: 2,
        }),
        go.GraphObject.make(
          go.Panel,
          'Horizontal',
          { alignment: go.Spot.TopLeft, margin: 8 },
          go.GraphObject.make(go.Picture, {
            source: 'assets/images/crud.svg', // ⚡ ICONO de CRUD (colócalo en assets/images)
            desiredSize: new go.Size(20, 20),
            margin: new go.Margin(0, 6, 0, 0),
          }),
          go.GraphObject.make(go.TextBlock, {
            font: 'bold 14pt sans-serif',
            editable: true,
          }).bindTwoWay('text')
        )
      )
    );

    this.myDiagram.nodeTemplateMap.add(
      'Attribute',
      go.GraphObject.make(
        go.Node,
        'Auto',
        {
          locationSpot: go.Spot.Center,
          fromSpot: go.Spot.AllSides,
          toSpot: go.Spot.AllSides,
          cursor: 'pointer',
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(go.Point.stringify),
        go.GraphObject.make(go.Shape, {
          fill: '#fefefe',
          stroke: '#ccc',
          strokeWidth: 1.5,
          figure: 'RoundedRectangle',
        }),
        go.GraphObject.make(
          go.Panel,
          'Vertical',
          { margin: 6 },
          go.GraphObject.make(
            go.Panel,
            'Horizontal',
            { alignment: go.Spot.Left },
            go.GraphObject.make(go.Picture, {
              desiredSize: new go.Size(16, 16),
              source: 'assets/images/column.svg',
              margin: new go.Margin(0, 4, 0, 0),
            }),
            go.GraphObject.make(
              go.TextBlock,
              {
                editable: true,
                font: 'bold 11pt sans-serif',
                margin: new go.Margin(0, 4, 0, 0),
                name: 'label',
              },
              new go.Binding('text', 'label').makeTwoWay()
            )
          ),
          go.GraphObject.make(
            go.Panel,
            'Horizontal',
            { alignment: go.Spot.Left },
            go.GraphObject.make(
              go.TextBlock,
              {
                editable: true,
                font: 'italic 9pt sans-serif',
                stroke: '#666',
                margin: new go.Margin(2, 0, 0, 0),
                name: 'name',
              },
              new go.Binding('text', 'name').makeTwoWay()
            ),
            go.GraphObject.make(
              go.TextBlock,
              {
                font: 'italic 9pt sans-serif',
                stroke: '#666',
                margin: new go.Margin(2, 0, 0, 4),
                name: 'type',
              },
              new go.Binding('text', 'type').makeTwoWay()
            )
          )
        )
      )
    );

    this.myDiagram.nodeTemplateMap.add(
      'CrudButton',
      go.GraphObject.make(
        go.Node,
        'Auto',
        {
          locationSpot: go.Spot.Center,
          cursor: 'pointer',
          fromSpot: go.Spot.Right,
          toSpot: go.Spot.None,
          fromLinkable: false,
          toLinkable: false,
        },
        new go.Binding('location', 'location', go.Point.parse).makeTwoWay(go.Point.stringify),
        go.GraphObject.make(
          go.Shape,
          'RoundedRectangle',
          {
            strokeWidth: 1.5,
            stroke: '#333',
            fill: 'lightgray' // se actualizará dinámicamente
          },
          new go.Binding('fill', 'inputType', (tipo) => {
            if (tipo === 'crear') return '#d4edda'; // verde claro
            if (tipo === 'editar') return '#fff3cd'; // amarillo claro
            if (tipo === 'eliminar') return '#f8d7da'; // rojo claro
            return '#e0e0e0'; // gris de fallback
          })
        ),
        go.GraphObject.make(
          go.TextBlock,
          {
            margin: 8,
            editable: true,
            font: 'bold 11pt sans-serif',
          },
          new go.Binding('text', 'inputType', (tipo) => {
            if (tipo === 'crear') return 'Crear';
            if (tipo === 'editar') return 'Editar';
            if (tipo === 'eliminar') return 'Eliminar';
            return 'Acción';
          })
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

  setClass(type: string, inputType?: string) {
    this.i++;
    const centerPoint =
      this.myDiagram?.viewportBounds.center || new go.Point(0, 0);

    let newNode: any = {
      key: this.i,
      category: type,
      location: go.Point.stringify(centerPoint),
    };

    if (type === 'Button') {
      newNode.label = 'Enviar';
      newNode.onClick = 'handleSubmit()';
    } else if (type === 'Input') {
      newNode.placeholder = 'Escribe aquí';
      newNode.name = `${type}-${inputType}-${this.i}`;
      newNode.binding = 'modelo.campo';
      newNode.inputType = inputType || 'text';
    } else if (type === 'Label') {
      newNode.text = 'Texto de etiqueta';
    } else if (type === 'Frame') {
      newNode.isGroup = true;
      newNode.category = 'Frame';
      newNode.text = 'Vista nueva';
      newNode.size = '800 500';
    } else if (type === 'Form') {
      newNode.isGroup = true;
      newNode.category = 'Form';
      newNode.text = 'Formulario';
      newNode.size = '550 350';
    } else if (type === 'Sidebar') {
      newNode.isGroup = true;
      newNode.category = 'Sidebar';
      newNode.text = 'Sidebar'; // Título editable
      newNode.size = '175 350'; // Tamaño típico de un sidebar
    } else if (type === 'Navbar') {
      newNode.isGroup = true;
      newNode.category = 'Navbar';
      newNode.text = 'Navbar'; // nombre editable
      newNode.size = '750 80'; // tamaño más lógico para navbar
    } else if (type === 'Card') {
      newNode.isGroup = true;
      newNode.category = 'Card';
      newNode.text = 'Título del Card';
      newNode.size = '400 300';
    } else if (type === 'Link') {
      // Nuevo caso
      newNode.text = 'Nuevo Enlace';
      newNode.routerLink = '/ruta'; // opcional si quieres que el link tenga asociado un "routerLink" en Angular
    } else if (type === 'List') {
      newNode.isGroup = true;
      newNode.category = 'List';
      newNode.text = 'Nueva Lista';
      newNode.modelName = 'miModelo'; // <-- 🔥 nuevo
      newNode.size = '400 300';
    } else if (type === 'Crud') {
      newNode.isGroup = true;
      newNode.category = 'Crud';
      newNode.text = 'Vista de CRUD';
      newNode.size = '800 500';
    } else if (type === 'Attribute') {
      newNode.name = `atributo-${this.i}`;
      newNode.type = inputType || 'string';
      newNode.label = 'Nombre Columna';
    } else if (type === 'CrudButton') {
      newNode.inputType = inputType || 'crear'; // crear, editar, eliminar
    }

    console.log('[AddNode] Nuevo nodo creado:', newNode);
    const model = this.myDiagram!.model as go.GraphLinksModel;
    this.myDiagram!.startTransaction('addClass');
    model.addNodeData(newNode);
    this.myDiagram!.commitTransaction('addClass');
    this.sendDiagramUpdate({ type: 'addClass', data: newNode });
  }

  startLinkMode() {
    console.log('[startLinkMode] Antes del if:');
    if (!this.myDiagram) return;
    console.log('[startLinkMode] Después del if:');
    this.myDiagram.toolManager.linkingTool.isEnabled = true;
    this.myDiagram.toolManager.relinkingTool.isEnabled = false;
    (this.myDiagram.div as HTMLDivElement).style.cursor = 'crosshair';
  }

  cancelLinkMode() {
    console.log('[cancelLinkMode] Antes del if:');
    if (!this.myDiagram) return;
    console.log('[cancelLinkMode] Después del if:');
    this.myDiagram.toolManager.linkingTool.isEnabled = false;
    this.myDiagram.currentTool.stopTool();
    (this.myDiagram.div as HTMLDivElement).style.cursor = 'default';
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
      linkDataArray: model.linkDataArray,
      linkKeyProperty: 'key',
    };
    this.myDiagram!.model = new go.GraphLinksModel({
      copiesArrays: true,
      copiesArrayObjects: true,
      nodeDataArray: model.nodeDataArray,
      linkDataArray: [],
      linkKeyProperty: 'key',
    });
  }
}
