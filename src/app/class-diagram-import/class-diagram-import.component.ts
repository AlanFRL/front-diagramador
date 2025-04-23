import { Component, EventEmitter, Output } from '@angular/core';
import * as go from 'gojs';

import * as XMIBuilder2 from 'xmlbuilder2';
import { convert } from 'xmlbuilder2';

interface GoJSconector {
  "category": string,
  "key": number,

}
interface GoJSNode {
  key: number;
  name: string;
  type: string;
  properties: {
    name: string;
    type: string;
    visibility: string;
  }[];
  methods: any[];
  x: number;
  y: number;
  position: any;
}

interface GoJSLink {
  from: number;
  to: number;
  labelKeys: number[];
  relationship: string;
  fromCardinality: string;
  toCardinality: string;
  type: string;
}


interface GoJSLinkG {
  from: number;
  to: number;
  relationship: string;
  type: string;
}

interface GoJSModel {
  nodeDataArray: (GoJSNode | GoJSconector)[];
  linkDataArray:  (GoJSLink | GoJSLinkG)[];
}

@Component({
  selector: 'app-class-diagram-import',
  templateUrl: './class-diagram-import.component.html',
  styleUrls: ['./class-diagram-import.component.css']
})
export class ClassDiagramImportComponent  {
  @Output() modelChange = new EventEmitter<any>();

  // JSON XMI de ejemplo (este es el que procesaremos)
  xmiJson = {
    "UML:Namespace.ownedElement": {
      "#": [
        {
          "UML:Class": {
            "@name": "Person",
            "@xmi.id": "person",
            "@visibility": "public",
            "UML:Classifier.feature": {
              "UML:Attribute": [
                {
                  "@name": "id",
                  "@visibility": "private",
                  "UML:TaggedValue": {
                    "@tag": "type",
                    "@value": "int"
                  }
                },
                {
                  "@name": "Nombre",
                  "@visibility": "private",
                  "UML:TaggedValue": {
                    "@tag": "type",
                    "@value": "String"
                  }
                }
              ]
            }
          }
        },
        {
          "UML:Class": {
            "@name": "Job",
            "@xmi.id": "job",
            "@visibility": "public",
            "UML:Classifier.feature": {
              "UML:Attribute": [
                {
                  "@name": "id",
                  "@visibility": "private",
                  "UML:TaggedValue": {
                    "@tag": "type",
                    "@value": "int"
                  }
                },
                {
                  "@name": "Descripción",
                  "@visibility": "private",
                  "UML:TaggedValue": {
                    "@tag": "type",
                    "@value": "String"
                  }
                }
              ]
            }
          }
        },
        {
          "UML:Association": {
            "@xmi.id": "EAID_9D918A93_250B_453e_8E70_E819D4D66F84",
            "UML:Association.connection": {
              "UML:AssociationEnd": [
                {
                  "@type": "person",
                  "@isNavigable": "true"
                },
                {
                  "@type": "job",
                  "@isNavigable": "true"
                }
              ]
            }
          }
        }
      ]
    }
  };
  gojsModel: GoJSModel = { nodeDataArray: [], linkDataArray: [] };

  constructor() { }

  ngOnInit(): void {
    
  }
 extractLeftAndTop(input: string): { left: number; top: number } | null {
    try {
        // Crear un mapa con las propiedades clave-valor de la cadena
        const properties: { [key: string]: number } = input.split(';').reduce((acc, pair) => {
            const [key, value] = pair.split('=');
            if (key && value) {
                acc[key.trim()] = parseInt(value.trim(), 10);
            }
            return acc;
        }, {} as { [key: string]: number });

        // Verificar si las claves Left y Top están presentes
        if (!('Left' in properties) || !('Top' in properties)) {
            throw new Error("La cadena no contiene 'Left' o 'Top'");
        }

        // Retornar los valores de Left y Top
        return { left: properties['Left'], top: properties['Top'] };
    } catch (error) {
        console.error('Error al procesar la cadena:', error);
        return null;
    }
}
  convertXMIToGoJS(xmiData: any): void {
    const xmiDato=JSON.parse(xmiData);

    console.log(xmiDato)
    const elements = xmiDato["XMI"]["XMI.content"]["UML:Model"]["UML:Namespace.ownedElement"]["UML:Package"]["UML:Namespace.ownedElement"]["#"];
    const coordenadas =xmiDato["XMI"]["XMI.content"]["UML:Diagram"]["UML:Diagram.element"]["UML:DiagramElement"];
    console.log(coordenadas)
    console.log('elements')
   console.log(elements)
    // const elements = xmiData["UML:Namespace.ownedElement"]["#"];
    const idToKeyMap: { [id: string]: number } = {};  // Mapa para el seguimiento de los IDs de las clases

    let keyCounter = 1;

    elements.forEach((element: any) => {
      if (Array.isArray(element["UML:Class"])) {
      console.log('element["UML:Class"]))')
      console.log(element["UML:Class"])
        element["UML:Class"].forEach((clas: any) => {
          const classElement = clas;
          console.log(clas)
          const className = classElement["@name"];
          const classId = classElement["@xmi.id"];
          let result
          coordenadas.forEach((coord: any) => {
            const coorde= coord;
            console.log(coord)
            
            if (classId== coorde["@subject"]){
              result = this.extractLeftAndTop(coorde["@geometry"]);
              // const left = result!.left
              // const top = result!.top
            }
          });


          let properties=[]
          // Verificar si la propiedad 'UML:Attribute' existe de manera segura
  const attributes = classElement?.["UML:Classifier.feature"]?.["UML:Attribute"] ?? undefined;
  
  console.log(attributes);
  
          if(attributes){
            console.log(attributes)
  
            properties = attributes.map((attr: any) => ({
              name: attr["@name"],
              type: attr["UML:ModelElement.taggedValue"]["UML:TaggedValue"].find((tag:any) => tag["@tag"] === "type")["@value"] || "undefined",
              visibility: attr["@visibility"] || "public"
            }));
          }
         
  
          // Crear el nodo para la clase
          const node: GoJSNode = {
            key: keyCounter,
            name: className,
            position: result!.left+' '+result!.top,
            type: "Class",
            properties: properties,
            methods: [],  // Vacío por ahora, ya que no se especifican métodos
            x: Math.random() * 400,
            y: result!.top,
            
            // x: Math.random() * 400,  // Coordenadas aleatorias
            // y: Math.random() * 400   // Coordenadas aleatorias
          };
  
          // Asignar el key basado en el xmi.id
          idToKeyMap[classId] = keyCounter;
          this.gojsModel.nodeDataArray.push(node);
          keyCounter++;
        })
        
      }else if (element["UML:Class"]){
        const classElement = element["UML:Class"];
        console.log(element)
        const className = classElement["@name"];
        const classId = classElement["@xmi.id"];
        let result
        coordenadas.forEach((coord: any) => {
          const coorde= coord;
          console.log(coord)
          
          if (classId== coorde["@subject"]){
            result = this.extractLeftAndTop(coorde["@geometry"]);
            // const left = result!.left
            // const top = result!.top
          }
        });
        let properties=[]
        // Verificar si la propiedad 'UML:Attribute' existe de manera segura
const attributes = classElement?.["UML:Classifier.feature"]?.["UML:Attribute"] ?? undefined;

console.log(attributes);

        if(attributes){
          console.log(attributes)

          properties = attributes.map((attr: any) => ({
            name: attr["@name"],
            type: attr["UML:ModelElement.taggedValue"]["UML:TaggedValue"].find((tag:any) => tag["@tag"] === "type")["@value"] || "undefined",
            visibility: attr["@visibility"] || "public"
          }));
          console.log('termina')
        }
       

        // Crear el nodo para la clase
        const node: GoJSNode = {
          key: keyCounter,
          name: className,
          position: result!.left+' '+result!.top,
          type: "Class",
          properties: properties,
          methods: [],  // Vacío por ahora, ya que no se especifican métodos
          x: result!.left,
          y: result!.top,
          
          // x: Math.random() * 400,  // Coordenadas aleatorias
          // y: Math.random() * 400   // Coordenadas aleatorias
        };

        // Asignar el key basado en el xmi.id
        idToKeyMap[classId] = keyCounter;
        this.gojsModel.nodeDataArray.push(node);
        keyCounter++;
        
       
      }


      
    }
    
  );
  elements.forEach((element: any) => {
    // Procesar las relaciones (Associations)
    if (Array.isArray(element["UML:Association"])) {

      element["UML:Association"].forEach((association: any) => {
        console.log(association)
      let relation= association["UML:ModelElement.taggedValue"]["UML:TaggedValue"][1]["@value"]
      let asociationclass=association["UML:ModelElement.taggedValue"]["UML:TaggedValue"]
      const associationEnds = association["UML:Association.connection"]["UML:AssociationEnd"];
      const fromC = associationEnds[0]["@multiplicity"] || "    ";
      const toC = associationEnds[1]["@multiplicity"]|| "     ";
      const fromId = associationEnds[0]["@type"];
      const toId = associationEnds[1]["@type"];
      const iscomposite=associationEnds[1]["@aggregation"];
      if(iscomposite=="composite"){
          relation="Composition";
      }
      if (asociationclass[19] && asociationclass[19]["@tag"]=="associationclass") {
        const to=asociationclass[19]["@value"]
       const conect: GoJSconector = {
          category: 'LinkLabel',
          key: keyCounter,
       }
       this.gojsModel.nodeDataArray.push(conect);

       const link3: GoJSLink = {
        from: idToKeyMap[fromId],
        to: idToKeyMap[toId],
        labelKeys:[keyCounter],
        relationship: relation,  // Valor predeterminado
        fromCardinality: '',         // Fijo para este ejemplo
        toCardinality: '*',           // Fijo para este ejemplo
        type: 'nton'
      };
      this.gojsModel.linkDataArray.push(link3);
      const link4: GoJSLink = {
        from: idToKeyMap[to],
        to: keyCounter,
        labelKeys:[],
        relationship: 'Conector',  // Valor predeterminado
        fromCardinality: '',         // Fijo para este ejemplo
        toCardinality: '*',           // Fijo para este ejemplo
        type: 'Conector'
      };
      this.gojsModel.linkDataArray.push(link4);
      keyCounter++;
        
        // const to=asociationclass[19]["@value"]
        // console.log(to)
        // console.log("asociationclass[9] existe:", asociationclass[19]);
        // const link: GoJSLink = {
        //   from: idToKeyMap[fromId],
        //   to: idToKeyMap[to],
        //   labelKeys:[],
        //   relationship: relation,  // Valor predeterminado
        //   fromCardinality: '',         // Fijo para este ejemplo
        //   toCardinality: '*',           // Fijo para este ejemplo
        //   type: 'nton'
        // };
        // this.gojsModel.linkDataArray.push(link);
        // const link2: GoJSLink = {
        //   from: idToKeyMap[toId],
        //   to: idToKeyMap[to],
        //   relationship: relation,  // Valor predeterminado
        //   fromCardinality: '',         // Fijo para este ejemplo
        //   toCardinality: '*',           // Fijo para este ejemplo
        //   type: 'nton'
        // };
        // this.gojsModel.linkDataArray.push(link2);
        // Aquí puedes realizar cualquier operación adicional con asociationclass[9]
      } else{
        const link: GoJSLink = {
          from: idToKeyMap[fromId],
          to: idToKeyMap[toId],
          labelKeys:[],
          relationship: relation,  // Valor predeterminado
          fromCardinality: fromC,         // Fijo para este ejemplo
          toCardinality: toC,           // Fijo para este ejemplo
          type: relation
        };
        this.gojsModel.linkDataArray.push(link);
      }
      
      

      
      })
    }else if (element["UML:Association"]){
      const association = element["UML:Association"];
      console.log(element)
      console.log(association)
      let relation= association["UML:ModelElement.taggedValue"]["UML:TaggedValue"][1]["@value"]
      let asociationclass=association["UML:ModelElement.taggedValue"]["UML:TaggedValue"]
      const associationEnds = association["UML:Association.connection"]["UML:AssociationEnd"];
      const fromC = associationEnds[0]["@multiplicity"] || "    ";
      const toC = associationEnds[1]["@multiplicity"]|| "     ";
      const fromId = associationEnds[0]["@type"];
      const toId = associationEnds[1]["@type"];
      const iscomposite=associationEnds[1]["@aggregation"];
      if(iscomposite=="composite"){
          relation="Composition";
      }
      
      if (asociationclass[19] && asociationclass[19]["@tag"]=="associationclass") {
      const to=asociationclass[19]["@value"]
       const conect: GoJSconector = {
          category: 'LinkLabel',
          key: keyCounter,
       }
       this.gojsModel.nodeDataArray.push(conect);

       const link3: GoJSLink = {
        from: idToKeyMap[fromId],
        to: idToKeyMap[toId],
        labelKeys:[keyCounter],
        relationship: relation,  // Valor predeterminado
        fromCardinality: '',         // Fijo para este ejemplo
        toCardinality: '*',           // Fijo para este ejemplo
        type: 'nton'
      };
      this.gojsModel.linkDataArray.push(link3);
      const link4: GoJSLink = {
        from: idToKeyMap[to],
        to: keyCounter,
        labelKeys:[],
        relationship: 'Conector',  // Valor predeterminado
        fromCardinality: '',         // Fijo para este ejemplo
        toCardinality: '*',           // Fijo para este ejemplo
        type: 'Conector'
      };
      this.gojsModel.linkDataArray.push(link4);
      keyCounter++;
        
        // console.log(to)
        // console.log("asociationclass[9] existe:", asociationclass[19]);
        // const link: GoJSLink = {
        //   from: idToKeyMap[fromId],
        //   to: idToKeyMap[to],
        //   relationship: relation,  // Valor predeterminado
        //   fromCardinality: '',         // Fijo para este ejemplo
        //   toCardinality: '*',           // Fijo para este ejemplo
        //   type: 'nton'
        // };
        // this.gojsModel.linkDataArray.push(link);
        // const link2: GoJSLink = {
        //   from: idToKeyMap[toId],
        //   to: idToKeyMap[to],
        //   relationship: relation,  // Valor predeterminado
        //   fromCardinality: '',         // Fijo para este ejemplo
        //   toCardinality: '*',           // Fijo para este ejemplo
        //   type: 'nton'
        // };
        // this.gojsModel.linkDataArray.push(link2);
        // Aquí puedes realizar cualquier operación adicional con asociationclass[9]
      } else{
        const link: GoJSLink = {
          from: idToKeyMap[fromId],
          to: idToKeyMap[toId],
          labelKeys:[],
          relationship: relation,  // Valor predeterminado
          fromCardinality: fromC,         // Fijo para este ejemplo
          toCardinality: toC,           // Fijo para este ejemplo
          type: relation
        };
        this.gojsModel.linkDataArray.push(link);
      }
    }
    if (element["UML:Generalization"]) {
      console.log(element)
      const association = element["UML:Generalization"];
      


      const fromId = association["@subtype"];
      const toId = association["@supertype"];

     
      
      const link: GoJSLinkG = {
        from: idToKeyMap[fromId],
        to: idToKeyMap[toId],
        relationship: "Generalization",  // Valor predeterminad
        type: "Generalization"
      };

      this.gojsModel.linkDataArray.push(link);
    }
  }
  
);
console.log('MODELO FINAL')
console.log(this.gojsModel)
  }
  selectedFile: File | null = null;
  convertedJson: any = null; // Para almacenar el JSON convertido

  // Método para manejar la selección del archivo
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/xml') {  // Asegúrate de que sea un archivo XML (XMI)
      this.selectedFile = file;
    } else {
      console.error('Por favor selecciona un archivo XMI válido (XML).');
    }
  }

  // Método para convertir el archivo XMI a JSON utilizando XMIBuilder2
  convertFile(): void {
    console.log('convertFile')
    if (!this.selectedFile) {
      console.error('No se ha seleccionado ningún archivo');
      return;
    }

    const reader = new FileReader();
    
    // Leer el archivo como texto
    reader.onload = (e: any) => {
      const fileContent = e.target.result;

      try {
        // Utiliza XMIBuilder2 para convertir el contenido del archivo XMI a JSON
        const jsonResult = convert(fileContent, { format: 'object' });
        this.convertedJson = jsonResult; // Almacena el resultado en una variable para mostrarlo o utilizarlo
        console.log('Archivo convertido a JSON:', jsonResult);
      } catch (error) {
        console.error('Error al convertir el archivo XMI a JSON:', error);
      }
    };

    // Inicia la lectura del archivo como texto
    reader.readAsText(this.selectedFile);
  }
  descargar() {
    if (!this.convertedJson) {
      console.error('No hay datos convertidos para descargar.');
      return;
    }
  
    // Convierte el objeto JSON a una cadena JSON para descargarlo
    const jsonString = JSON.stringify(this.convertedJson, null, 2);
    console.log('jsonString:')
    console.log(jsonString)
    // // console.log(jsonString)
    this.convertXMIToGoJS(jsonString);
    console.log('gojsModel')
    console.log(this.gojsModel); 
    this.modelChange.emit(this.gojsModel);
    // Crea un blob con el contenido JSON
    // const blob = new Blob([jsonString], { type: 'application/json' });
    // const url = window.URL.createObjectURL(blob);
  
    // // Crea un enlace temporal para descargar el archivo
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = 'class_diagram.json';  // Cambia el nombre del archivo a .json
    // a.click();
  
    // // Libera el objeto URL
    // window.URL.revokeObjectURL(url);
  }
}
