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

  constructor(
    private socketService: SocketService,
    private cookieService: CookieService,
    private diagramService: DiagramService
  ) {}

  ngOnInit(): void {
    this.currentModel = {
      nodeDataArray: [],
      linkDataArray: [],
    };

    // Obtener el código de la sala desde la URL
    this.roomCode = this.cookieService.get('room') || '12345';

    // this.generateXML();
    // Conectar al servidor de sockets
    this.socketService.connectToRoom(this.roomCode);
    if (history.state.diagram) {
      this.diagram = history.state.diagram;
    }

    //Escuchar los eventos

    this.socketService.listenEvent('evento').subscribe((data) => {
      const linkData = data;
      console.log('Datos recibidos data: ', linkData);
      const type = linkData.type;
      console.log('Datos recibidos data2: ', type);
      const model = this.myDiagram!.model as go.GraphLinksModel;
      if (type === 'addClass') {
        const model = this.myDiagram!.model as go.GraphLinksModel;
        model.addNodeData(data.data);
      }
      if (type === 'addlink') {
        console.log('addlink');
        const linkDats = linkData.data;

        model.addLinkData(linkDats);
        // this.myDiagram!.model.set(linkData, 'relationship', data.data.value);
        // this.myDiagram!.model.set(linkData, 'fromCardinality', '*');
      }
      if (type === 'deletedClass') {
        const nodeIdToDelete = linkData.data.key; // Asegúrate de que 'id' corresponda con la clave única del nodo
        const nodeData = model.findNodeDataForKey(nodeIdToDelete);

        if (nodeData) {
          model.removeNodeData(nodeData);
          console.log('Nodo eliminado:', nodeData);
        } else {
          console.log('No se encontró el nodo con id:', nodeIdToDelete);
        }
      }
      if (type === 'deletedLink') {
        const fromNodeKey = linkData.data.from; // Clave del nodo de origen
        const toNodeKey = linkData.data.to; // Clave del nodo de destino

        const linkDataToRemove = model.linkDataArray.find(
          (link) => link['from'] === fromNodeKey && link['to'] === toNodeKey
        );

        if (linkDataToRemove) {
          model.removeLinkData(linkDataToRemove);
          console.log('Enlace eliminado:', linkDataToRemove);
        } else {
          console.log(
            'No se encontró el enlace de',
            fromNodeKey,
            'a',
            toNodeKey
          );
        }
      }

      if (type === 'editpropiedad') {
        const updatedNodeData = linkData.data; // Datos del nodo actualizado (propiedad editada)

        const existingNodeData = model.findNodeDataForKey(updatedNodeData.key); // Buscar el nodo a editar por su clave

        if (existingNodeData) {
          // Iniciar una transacción para actualizar las propiedades del nodo
          this.myDiagram!.model.startTransaction('update node');

          // Actualizar todas las propiedades del nodo que fueron editadas
          for (const prop in updatedNodeData) {
            if (updatedNodeData.hasOwnProperty(prop)) {
              this.myDiagram!.model.setDataProperty(
                existingNodeData,
                prop,
                updatedNodeData[prop]
              );
            }
          }

          this.myDiagram!.model.commitTransaction('update node');
          console.log('Nodo actualizado:', existingNodeData);
        } else {
          console.log('No se encontró el nodo con clave:', updatedNodeData.key);
        }
      }

      if (type === 'moveNodeLive') {
        const moveData = data.data;
        const model = this.myDiagram!.model as go.GraphLinksModel;

        // Encontrar el nodo en el modelo
        const nodeData = model.findNodeDataForKey(moveData.key);

        if (nodeData) {
          // Encontrar el nodo visual correspondiente en el diagrama
          const node = this.myDiagram!.findNodeForKey(moveData.key);

          if (node) {
            // Cambiar la ubicación del nodo visual
            node.location = new go.Point(
              moveData.position.x,
              moveData.position.y
            );
            console.log('Nodo movido:', nodeData);
          } else {
            console.log(
              'No se encontró el nodo visual con la clave:',
              moveData.key
            );
          }
        } else {
          console.log('No se encontró el nodo con la clave:', moveData.key);
        }
      }

      if (type === 'updateLink') {
        console.log('Listener de type updateLink ejecutado');
        const updatedLinkData = linkData.data;
        console.log('antes de buscar el enlace en el modelo local');
        // Encuentra el enlace en el modelo local
        const existingLinkData = model.linkDataArray.find(
          (link) => link['from'] === updatedLinkData['from'] && link['to'] === updatedLinkData['to']
        );
        
        console.log('antes de actualizar el enlace');
        if (existingLinkData) {
          // Inicia una transacción para actualizar el enlace
          this.myDiagram!.model.startTransaction('update link');
      
          // Actualiza las propiedades del enlace
          this.myDiagram!.model.setDataProperty(existingLinkData, 'fromCardinality', updatedLinkData.fromCardinality);
          this.myDiagram!.model.setDataProperty(existingLinkData, 'toCardinality', updatedLinkData.toCardinality);
      
          // Puedes actualizar otras propiedades si es necesario
          this.myDiagram!.model.setDataProperty(existingLinkData, 'relationship', updatedLinkData.relationship);
      
          this.myDiagram!.model.commitTransaction('update link');
          console.log('Enlace actualizado en el modelo local:', existingLinkData);
        } else {
          console.log('No se encontró el enlace para actualizar:', updatedLinkData);
        }
      }
      
      

    });
  }

  // Enviar un evento al servidor
  sendDiagramUpdate(data: any): void {
    this.socketService.sendEvent('evento', data);
    console.log('enviado');
  }

  ngOnDestroy(): void {
    // Desconectar cuando el componente sea destruido
    this.socketService.disconnect();
  }

  title = 'diagram';
  selectedLinkType = 'Inheritance';
  public linkingMode: boolean = false;
  public i = 15;

  public myDiagram?: go.Diagram | undefined;

  public ngAfterViewInit() {
    this.myDiagram = new go.Diagram('myDiagramDiv', {
      'undoManager.isEnabled': true,
      layout: new go.Layout({}),
      'linkingTool.isEnabled': false,
      'relinkingTool.isEnabled': false,
      LinkDrawn: maybeChangeLinkCategory, // these two DiagramEvents call a
      LinkRelinked: maybeChangeLinkCategory, // function that is defined below
    });

    // Mostrar la visibilidad o el acceso como un solo carácter al principio de cada propiedad o método
    function convertVisibility(v: any) {
      switch (v) {
        case 'public':
          return '+';
        case 'private':
          return '-';
        case 'protected':
          return '#';
        case 'package':
          return '~';
        default:
          return v;
      }
    }

    // the item template for properties
    var propertyTemplate = new go.Panel('Horizontal').add(
      // property visibility/access
      new go.TextBlock({ isMultiline: false, editable: false, width: 12 }).bind(
        'text',
        'visibility',
        convertVisibility
      ),
      // property name, underlined if scope=="class" to indicate static property
      new go.TextBlock({ isMultiline: false, editable: true })
        .bindTwoWay('text', 'name')
        .bind('isUnderline', 'scope', (s) => s[0] === 'c'),
      // property type, if known
      new go.TextBlock('').bind('text', 'type', (t) => (t ? ': ' : '')),
      new go.TextBlock({ isMultiline: false, editable: true }).bindTwoWay(
        'text',
        'type'
      ),
      // property default value, if any
      new go.TextBlock({ isMultiline: false, editable: false }).bind(
        'text',
        'default',
        (s) => (s ? ' = ' + s : '')
      )
    );

    // the item template for methods
    var methodTemplate = new go.Panel('Horizontal').add(
      // method visibility/access
      new go.TextBlock({ isMultiline: false, editable: false, width: 12 }).bind(
        'text',
        'visibility',
        convertVisibility
      ),
      // method name, underlined if scope=="class" to indicate static method
      new go.TextBlock({ isMultiline: false, editable: true })
        .bindTwoWay('text', 'name')
        .bind('isUnderline', 'scope', (s) => s[0] === 'c'),
      // method parameters
      new go.TextBlock('()')
        // this does not permit adding/editing/removing of parameters via inplace edits
        .bind('text', 'parameters', (parr) => {
          var s = '(';
          for (var i = 0; i < parr.length; i++) {
            var param = parr[i];
            if (i > 0) s += ', ';
            s += param.name + ': ' + param.type;
          }
          return s + ')';
        }),
      // method return type, if any
      new go.TextBlock('').bind('text', 'type', (t) => (t ? ': ' : '')),
      new go.TextBlock({ isMultiline: false, editable: true }).bindTwoWay(
        'text',
        'type'
      )
    );

    const nodeContextMenu = go.GraphObject.make(
      go.Adornment,
      'Vertical',
      // Botón para agregar una propiedad
      go.GraphObject.make(
        'ContextMenuButton',
        go.GraphObject.make(go.TextBlock, 'Agregar Propiedad'),
        {
          click: (e, obj) => {
            const node = (obj.part as go.Adornment).adornedPart;
            this.addPropertyToNode(node!.data); // Llama a la función para agregar propiedad
          },
        }
      ),
      // Botón para agregar un método
      go.GraphObject.make(
        'ContextMenuButton',
        go.GraphObject.make(go.TextBlock, 'Agregar Método'),
        {
          click: (e, obj) => {
            const node = (obj.part as go.Adornment).adornedPart;
            this.addMethodToNode(node!.data); // Llama a la función para agregar método
          },
        }
      ),
      // Botón para eliminar el nodo
      go.GraphObject.make(
        'ContextMenuButton',
        go.GraphObject.make(go.TextBlock, 'Eliminar Clase'),
        {
          click: (e, obj) => {
            const node = (obj.part as go.Adornment).adornedPart;
            this.deleteNode(node!.data); // Llama a la función para eliminar nodo
          },
        }
      )
    );

    // this simple template does not have any buttons to permit adding or
    // removing properties or methods, but it could!

    this.myDiagram.nodeTemplate = new go.Node('Auto', {
      contextMenu: nodeContextMenu,
      locationSpot: go.Spot.Center,
      fromSpot: go.Spot.AllSides,
      toSpot: go.Spot.AllSides,
      portId: '', // declare this Shape to be the port element for the Node
      cursor: 'pointer',
      fromLinkableSelfNode: true,
      fromLinkable: true,
      fromLinkableDuplicates: true,
      toLinkable: true,
      toLinkableSelfNode: true,
      toLinkableDuplicates: true,
    })
      .bind(
        new go.Binding('location', 'position', go.Point.parse).makeTwoWay(
          go.Point.stringify
        )
      )
      .add(
        new go.Shape({ fill: 'lightyellow' }),
        new go.Panel('Table', { defaultRowSeparatorStroke: 'black' }).add(
          // header
          new go.TextBlock({
            row: 0,
            columnSpan: 2,
            margin: 3,
            alignment: go.Spot.Center,
            font: 'bold 12pt sans-serif',
            isMultiline: false,
            editable: true,
          }).bindTwoWay('text', 'name'),
          // properties
          new go.TextBlock('Properties', {
            row: 1,
            font: 'italic 10pt sans-serif',
          }).bindObject(
            'visible',
            'visible',
            (v) => !v,
            undefined,
            'PROPERTIES'
          ),
          new go.Panel('Vertical', {
            name: 'PROPERTIES',
            row: 1,
            margin: 3,
            stretch: go.Stretch.Horizontal,
            defaultAlignment: go.Spot.Left,
            background: 'lightyellow',
            itemTemplate: propertyTemplate,
          }).bind('itemArray', 'properties'),
          go.GraphObject.build(
            'PanelExpanderButton',
            {
              row: 1,
              column: 1,
              alignment: go.Spot.TopRight,
              visible: false,
            },
            'PROPERTIES'
          ).bind('visible', 'properties', (arr) => arr.length > 0),
          // methods
          new go.TextBlock('Methods', {
            row: 2,
            font: 'italic 10pt sans-serif',
          }).bindObject('visible', 'visible', (v) => !v, undefined, 'METHODS'),
          new go.Panel('Vertical', {
            name: 'METHODS',
            row: 2,
            margin: 3,
            stretch: go.Stretch.Horizontal,
            defaultAlignment: go.Spot.Left,
            background: 'lightyellow',
            itemTemplate: methodTemplate,
          }).bind('itemArray', 'methods'),
          go.GraphObject.build(
            'PanelExpanderButton',
            {
              row: 2,
              column: 1,
              alignment: go.Spot.TopRight,
              visible: false,
            },
            'METHODS'
          ).bind('visible', 'methods', (arr) => arr.length > 0)
        )
      );

    this.myDiagram.addModelChangedListener((e) => {
      if (
        e.change === go.ChangedEvent.Remove &&
        e.modelChange === 'nodeDataArray'
      ) {
        // El nodo ha sido eliminado
        var deletedNodeData = e.oldValue; // Datos del nodo eliminado
        console.log('Nodo eliminado:', deletedNodeData);
        this.sendDiagramUpdate({ type: 'deletedClass', data: deletedNodeData });
      }
    });

    this.myDiagram.addModelChangedListener((e) => {
      if (
        e.change === go.ChangedEvent.Remove &&
        e.modelChange === 'linkDataArray'
      ) {
        // El enlace ha sido eliminado
        var deletedLinkData = e.oldValue; // Datos del enlace eliminado
        console.log('Enlace eliminado:', deletedLinkData);
        this.sendDiagramUpdate({ type: 'deletedLink', data: deletedLinkData });
      }
    });

    this.myDiagram.addDiagramListener('LinkDrawn', (e) => {
      console.log('listener LinkDrawn');
      const link = e.subject;

      console.log(link.data);

      // Definir el objeto 'datos' con las propiedades requeridas
      const datos = {
        from: link.data.from, // ID del nodo origen
        to: link.data.to, // ID del nodo destino
        relationship:
          this.selectedLinkType === 'nton'
            ? 'Association'
            : this.selectedLinkType,
        fromCardinality:
          this.selectedLinkType === 'Generalization' ||
          this.selectedLinkType === 'Conector'
            ? ''
            : '1',
        toCardinality:
          this.selectedLinkType === 'Generalization' ||
          this.selectedLinkType === 'Conector'
            ? ''
            : '*',
        type: this.selectedLinkType,
      };
      // Mostrar 'datos' en la consola para depuración
      // console.log(datos);

      this.sendDiagramUpdate({ type: 'addlink', data: datos });
      // Establecer los valores del modelo GoJS según las condiciones
      if (this.selectedLinkType === 'nton') {
        // this.myDiagram!.model.set(link.data, 'relationship', 'Association');
        // Crea un nodo de etiqueta
        var labelNodeData = { category: 'LinkLabel' };
        this.myDiagram!.model.addNodeData(labelNodeData);
        var labelNode = this.myDiagram!.findNodeForData(labelNodeData);
        console.log(labelNodeData);
        // Asocia el nodo de etiqueta al enlace
        this.myDiagram!.model.setDataProperty(link.data, 'labelKeys', [
          this.myDiagram!.model.getKeyForNodeData(labelNodeData),
        ]);
      } //else {
      //   this.myDiagram!.model.set(link.data, 'relationship', this.selectedLinkType);
      // }

      // if (this.selectedLinkType !== 'Generalization') {
      //   this.myDiagram!.model.set(link.data, 'fromCardinality', '1');
      //   this.myDiagram!.model.set(link.data, 'toCardinality', '*');
      // }
      this.myDiagram!.model.set(
        link.data,
        'relationship',
        this.selectedLinkType === 'nton' ? 'Association' : this.selectedLinkType
      );

      this.myDiagram!.model.set(
        link.data,
        'fromCardinality',
        this.selectedLinkType === 'Generalization' ||
          this.selectedLinkType === 'Conector'
          ? ''
          : '1'
      );
      this.myDiagram!.model.set(
        link.data,
        'toCardinality',
        this.selectedLinkType === 'Generalization' ||
          this.selectedLinkType === 'Conector'
          ? ''
          : '*'
      );

      this.myDiagram!.model.set(link.data, 'type', this.selectedLinkType);

      this.linkingMode = !this.linkingMode;
      this.myDiagram!.toolManager.linkingTool.isEnabled = this.linkingMode;
      this.myDiagram!.toolManager.relinkingTool.isEnabled = this.linkingMode;
    });

    this.myDiagram.addDiagramListener('TextEdited', (e) => {
      console.log('Evento TextEdited disparado:', e.subject.part);
      const editedPart = e.subject.part;
      
      if (editedPart instanceof go.Link) {
        // Si el cambio ocurre en un enlace, actualizamos las cardinalidades
        const linkData = editedPart.data;
    
        console.log('Cardinalidad modificada:', linkData);
        
        // Enviar actualización al servidor
        this.sendDiagramUpdate({ type: 'updateLink', data: linkData });
      } else if (editedPart instanceof go.Node) {
        // Si el cambio ocurre en un nodo
        const nodeData = editedPart.data;
        console.log('Nodo modificado desde la interfaz:', nodeData);
        this.sendDiagramUpdate({ type: 'editpropiedad', data: nodeData });
      }
    });
    


    this.myDiagram.addDiagramListener('SelectionMoved', (e) => {
      const diagram = e.diagram;

      diagram.selection.each((part) => {
        if (part instanceof go.Node) {
          const nodeData = part.data;

          // Obtenemos la nueva posición del nodo
          const newPosition = part.position;

          // Estructura de los datos a enviar
          const moveData = {
            key: nodeData.key, // Clave única del nodo
            position: {
              x: newPosition.x,
              y: newPosition.y,
            },
          };

          // Enviar los datos del movimiento
          this.sendDiagramUpdate({ type: 'moveNodeLive', data: moveData });
        }
      });
    });

    this.myDiagram.nodeTemplateMap.add(
      'LinkLabel',
      new go.Node({
        selectable: false,
        avoidable: false,
        layerName: 'Foreground',
      }) // always have link label nodes in front of Links
        .add(
          new go.Shape('Ellipse', {
            width: 1,
            height: 1,
            stroke: null,
            portId: '',
            fromLinkable: true,
            toLinkable: true,
            cursor: 'pointer',
          })
        )
    );

    function linkStyle() {
      return {
        isTreeLink: false,
        fromEndSegmentLength: 0,
        toEndSegmentLength: 0,
      };
    }

    this.myDiagram.linkTemplate = new go.Link({
      // by default, "Inheritance" or "Generalization"
      ...linkStyle(),
      relinkableFrom: true,
      relinkableTo: true,
      // draw the link path shorter than normal,
      // so that it does not interfere with the appearance of the arrowhead
      toShortLength: 2,
    }).add(
      new go.Shape(),
      new go.Shape({ toArrow: 'Triangle', fill: 'white' })
    );
    this.myDiagram.linkTemplateMap.add(
      'Conector',
      go.GraphObject.make(
        go.Link,
        linkStyle(),

        // Línea del enlace
        go.GraphObject.make(go.Shape, {
          strokeDashArray: [5, 5], // Define el patrón de punteado [longitud del trazo, espacio]
        })
      )
    );

    this.myDiagram.linkTemplateMap.add(
      'Association',
      go.GraphObject.make(
        go.Link,
        linkStyle(),

        // Línea del enlace
        go.GraphObject.make(go.Shape),

        // Cardinalidad en el origen (from)
        go.GraphObject.make(go.TextBlock, {
          segmentIndex: 0, // Posiciona el texto en el primer punto del enlace
          segmentOffset: new go.Point(10, -15), // Ajusta la posición
          segmentOrientation: go.Link.OrientUpright, // Mantiene la orientación del texto recta
          editable: true, // Permite la edición
        }).bind(new go.Binding('text', 'fromCardinality').makeTwoWay()),

        // Cardinalidad en el destino (to)
        go.GraphObject.make(go.TextBlock, {
          segmentIndex: -1, // Posiciona el texto en el último punto del enlace
          segmentOffset: new go.Point(-10, 15), // Ajusta la posición
          segmentOrientation: go.Link.OrientUpright, // Mantiene la orientación del texto recta
          editable: true, // Permite la edición
        }).bind(new go.Binding('text', 'toCardinality').makeTwoWay())
      )
    );

    this.myDiagram.linkTemplateMap.add(
      'Realization',
      new go.Link(linkStyle()).add(
        new go.Shape({ strokeDashArray: [3, 2] }),
        new go.Shape({ toArrow: 'Triangle', fill: 'white' })
      )
    );

    this.myDiagram.linkTemplateMap.add(
      'Dependency',
      new go.Link(linkStyle()).add(
        new go.Shape({ strokeDashArray: [3, 2] }),
        new go.Shape({ toArrow: 'OpenTriangle' })
      )
    );

    this.myDiagram.linkTemplateMap.add(
      'Composition',
      new go.Link(linkStyle()).add(
        new go.Shape(),
        new go.Shape({ fromArrow: 'StretchedDiamond', scale: 1.3 }),
        // Cardinalidad en el origen (from)
        go.GraphObject.make(go.TextBlock, {
          segmentIndex: 0, // Posiciona el texto en el primer punto del enlace
          segmentOffset: new go.Point(10, -15), // Ajusta la posición
          segmentOrientation: go.Link.OrientUpright, // Mantiene la orientación del texto recta
          editable: true, // Permite la edición
        }).bind(new go.Binding('text', 'fromCardinality')),

        // Cardinalidad en el destino (to)
        go.GraphObject.make(go.TextBlock, {
          segmentIndex: -1, // Posiciona el texto en el último punto del enlace
          segmentOffset: new go.Point(-10, 15), // Ajusta la posición
          segmentOrientation: go.Link.OrientUpright, // Mantiene la orientación del texto recta
          editable: true, // Permite la edición
        }).bind(new go.Binding('text', 'toCardinality')),
        new go.Shape({ toArrow: 'OpenTriangle' })
      )
    );

    this.myDiagram.linkTemplateMap.add(
      'Aggregation',
      new go.Link(linkStyle()).add(
        new go.Shape(),
        new go.Shape({
          fromArrow: 'StretchedDiamond',
          fill: 'white',
          scale: 1.3,
        }),
        // Cardinalidad en el origen (from)
        go.GraphObject.make(go.TextBlock, {
          segmentIndex: 0, // Posiciona el texto en el primer punto del enlace
          segmentOffset: new go.Point(10, -15), // Ajusta la posición
          segmentOrientation: go.Link.OrientUpright, // Mantiene la orientación del texto recta
          editable: true, // Permite la edición
        }).bind(new go.Binding('text', 'fromCardinality')),

        // Cardinalidad en el destino (to)
        go.GraphObject.make(go.TextBlock, {
          segmentIndex: -1, // Posiciona el texto en el último punto del enlace
          segmentOffset: new go.Point(-10, 15), // Ajusta la posición
          segmentOrientation: go.Link.OrientUpright, // Mantiene la orientación del texto recta
          editable: true, // Permite la edición
        }).bind(new go.Binding('text', 'toCardinality')),
        new go.Shape({ toArrow: 'OpenTriangle' })
      )
    );

    this.myDiagram.linkTemplateMap.add(
      'linkToLink',
      new go.Link({ relinkableFrom: true, relinkableTo: true }).add(
        new go.Shape({ stroke: '#2D9945', strokeWidth: 2 })
      )
    );
    var nodedata = [
      {
        key: 1,
        name: 'BankAccount',
        properties: [
          { name: 'owner', type: 'String', visibility: 'public' },
          {
            name: 'balance',
            type: 'Currency',
            visibility: 'public',
            default: '0',
          },
        ],
        methods: [
          {
            name: 'deposit',
            parameters: [{ name: 'amount', type: 'Currency' }],
            visibility: 'public',
          },
          {
            name: 'withdraw',
            parameters: [{ name: 'amount', type: 'Currency' }],
            visibility: 'public',
          },
        ],
      },
    ];
    var linkdata = [{ from: 1, to: 1, relationship: 'Association' }];
    if (this.diagram.model) {
      const model = this.diagram.model;
      this.currentModel = {
        nodeDataArray: model.nodeDataArray,
        linkDataArray: model.linkDataArray,
      };
      this.myDiagram.model = new go.GraphLinksModel({
        copiesArrays: true,
        copiesArrayObjects: true,
        linkCategoryProperty: 'relationship',
        linkLabelKeysProperty: 'labelKeys',
        nodeDataArray: model.nodeDataArray,
        linkDataArray: model.linkDataArray,
      });
      this.myDiagram.nodes.each((node) => {
        const data = node.data;
        if (data.x !== undefined && data.y !== undefined) {
          console.log(data);
          node.position = new go.Point(data.x, data.y);
        }
      });
    } else {
      this.myDiagram.model = new go.GraphLinksModel({
        copiesArrays: true,
        copiesArrayObjects: true,
        linkCategoryProperty: 'relationship',
        linkLabelKeysProperty: 'labelKeys',
        nodeDataArray: [
          { key: 1, name: 'Class1', position: '0 0' }, // Nodo principal
          { key: 2, name: 'Class2', position: '150 0' }, // Nodo principal
          { category: 'LinkLabel', key: -1, position: '75 0' }, // Nodo de etiqueta
        ],
        linkDataArray: [
          { from: 1, to: 2, labelKeys: [-1], relationship: 'Association' }, // Enlace con etiqueta
        ],
      });
    }
    // this.myDiagram.toolManager.linkingTool.archetypeLabelNodeData = {
    //   category: 'LinkLabel'
    // };

    function maybeChangeLinkCategory(e: any) {
      var link = e.subject;
      var linktolink = link.fromNode.isLinkLabel || link.toNode.isLinkLabel;
      e.diagram.model.setCategoryForLinkData(
        link.data,
        linktolink ? 'linkToLink' : ''
      );
    }
  }

  setClass(type: any) {
    this.i++;
    const classNode = {
      key: this.i,
      name: type,
      type: type,
      properties: [{ name: 'property', type: 'type', visibility: 'public' }],
      methods: [
        // { name: 'method1', parameters: [{ name: 'class', type: 'Course' }], visibility: 'private' },
        // { name: 'method2', visibility: 'private' }
      ],
    };
    const model = this.myDiagram!.model as go.GraphLinksModel;

    // Añade el nodo de datos al modelo
    model.addNodeData(classNode);
    console.log(model.nodeDataArray);
    console.log('modelo');
    this.sendDiagramUpdate({ type: 'addClass', data: classNode });
    // this.sendDiagramUpdate('addClass', classNode);

    console.log(model.nodeDataArray);
  }
  addPropertyToNode(nodeData: any) {
    this.myDiagram!.startTransaction('add property');

    // Si no tiene propiedades, inicializa un array vacío
    if (!nodeData.properties) {
      nodeData.properties = [];
    }

    // Agrega una nueva propiedad con valores predeterminados
    nodeData.properties.push({
      name: 'newProperty', // Nombre de propiedad predeterminado
      type: 'string', // Tipo de propiedad predeterminado
      visibility: 'public', // Visibilidad predeterminada
    });

    // Actualiza el modelo
    this.myDiagram!.model.updateTargetBindings(nodeData);

    this.myDiagram!.commitTransaction('add property');
  }

  addMethodToNode(nodeData: any) {
    this.myDiagram!.startTransaction('add method');

    // Si no tiene métodos, inicializa un array vacío
    if (!nodeData.methods) {
      nodeData.methods = [];
    }

    // Agrega un nuevo método con valores predeterminados
    nodeData.methods.push({
      name: 'newMethod', // Nombre de método predeterminado
      parameters: [], // Parámetros vacíos por defecto
      type: 'void', // Tipo de retorno por defecto
      visibility: 'public', // Visibilidad predeterminada
    });

    // Actualiza el modelo
    this.myDiagram!.model.updateTargetBindings(nodeData);

    this.myDiagram!.commitTransaction('add method');
  }
  deleteNode(nodeData: any) {
    this.myDiagram!.startTransaction('delete node');

    // Elimina el nodo seleccionado
    this.myDiagram!.model.removeNodeData(nodeData);

    this.myDiagram!.commitTransaction('delete node');
  }

  setLinkType(type: string) {
    this.linkingMode = !this.linkingMode;
    this.myDiagram!.toolManager.linkingTool.isEnabled = this.linkingMode;
    this.myDiagram!.toolManager.relinkingTool.isEnabled = this.linkingMode;
    // Cambiar el tipo de enlace seleccionado
    this.selectedLinkType = type;
    console.log('Tipo de enlace seleccionado:', this.selectedLinkType);
  }

  coordenadas() {
    console.log('modelo con link');
    const jsonModel = JSON.parse(this.myDiagram!.model.toJson());
    jsonModel.nodeDataArray.forEach((nodeData: any) => {
      // Encontrar el nodo en el diagrama usando su key
      const node = this.myDiagram!.findNodeForKey(nodeData.key);

      if (node !== null) {
        // Obtener las coordenadas (x, y) del nodo
        const location = node.location;
        nodeData.x = location.x; // Agregar coordenada X
        nodeData.y = location.y; // Agregar coordenada Y
      }
    });
    console.log(JSON.stringify(jsonModel, null, 2));
    this.xmlDocument = jsonModel;
    this.jsonmodel = JSON.stringify(jsonModel); // Convertir el modelo a string
    this.diagram.model = jsonModel;
  }
  saveDiagram() {
    this.coordenadas();
    this.diagramService.updateDiagram(this.diagram.id, this.diagram).subscribe(
      (response) => {
        console.log('Diagram updated:', response);
        alert('Diagrama Guardado');
        // Manejar respuesta, mostrar mensaje de éxito, etc.
      },
      (error) => {
        console.error('Error updating diagram:', error);
        // Manejar error
      }
    );
  }
  onModelChange(model: any) {
    console.log('Modelo recibido:', model);
    // this.myDiagram!.model=model;
    this.currentModel = {
      nodeDataArray: model.nodeDataArray,
      linkDataArray: model.linkDataArray,
    };
    this.myDiagram!.model = new go.GraphLinksModel({
      copiesArrays: true,
      copiesArrayObjects: true,
      linkCategoryProperty: 'relationship',
      linkLabelKeysProperty: 'labelKeys',
      nodeDataArray: model.nodeDataArray,
      linkDataArray: model.linkDataArray,
    });
    console.log('Modelo recibido:', this.myDiagram!.model);
    // Aquí puedes realizar cualquier acción adicional con gojsModel
  }
}
