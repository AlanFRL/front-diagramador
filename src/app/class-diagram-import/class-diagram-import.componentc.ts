import { Component, OnInit } from '@angular/core';
import * as XMIBuilder2 from 'xmlbuilder2';
import { convert } from 'xmlbuilder2';

// Define interfaces for the GoJS model
interface GoJSModel {
  class: string;
  copiesArrays: boolean;
  copiesArrayObjects: boolean;
  linkCategoryProperty: string;
  nodeDataArray: NodeData[];
  linkDataArray: LinkData[];
}

interface NodeData {
  key: number;
  name: string;
  type: string;
  properties: Property[];
  methods: string[];
  x: number;
  y: number;
}

interface Property {
  name: string;
  type: string;
  visibility: string;
}

interface LinkData {
  from: number;
  to: number;
  relationship: string;
  fromCardinality?: string;
  toCardinality?: string;
  type: string;
}


@Component({
  selector: 'app-class-diagram-importc',
  templateUrl: './class-diagram-import.component.html',
  styleUrls: ['./class-diagram-import.component.css']
})
export class ClassDiagramImportComponent  {
  gojsModel: GoJSModel | null = null;
  // JSON XMI de ejemplo (este es el que procesaremos)
  xmIson = {
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
  // gojsModel: GoJSModel = { nodeDataArray: [], linkDataArray: [] };

  constructor() { }

  ngOnInit(): void {
    
  }

  convertToGoJSModel(xmiJson: any): GoJSModel {
    const xmiDato=JSON.parse(xmiJson)
    console.log(xmiDato)
    const nodes: NodeData[] = [];
    const links: LinkData[] = [];

    // Traverse the XMI JSON to extract nodes and links
    xmiDato["xmi:XMI"]["uml:Model"]["packagedElement"]["packagedElement"].forEach((element: any, index: number) => {
      if (element["@xmi:type"] === "uml:Class") {
        nodes.push({
          key: index + 1,
          name: element["@name"],
          type: element["@xmi:type"],
          properties: [
            {
              name: element.ownedAttribute["@name"],
              type: "type", // Map types if needed
              visibility: element.ownedAttribute["@visibility"]
            }
          ],
          methods: [],
          x: Math.random() * 500, // Random coordinates for now
          y: Math.random() * 500
        });
      }

      if (element["@xmi:type"] === "uml:Association") {
        const from = nodes.findIndex(n => n.name === element.memberEnd[0]["@xmi:idref"]) + 1;
        const to = nodes.findIndex(n => n.name === element.memberEnd[1]["@xmi:idref"]) + 1;

        links.push({
          from: from,
          to: to,
          relationship: "Association",
          type: "Association"
        });
      }
    });

    return {
      class: "GraphLinksModel",
      copiesArrays: true,
      copiesArrayObjects: true,
      linkCategoryProperty: "relationship",
      nodeDataArray: nodes,
      linkDataArray: links
    };
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

    console.log("antes de la conversión")
  
    // Convierte el objeto JSON a una cadena JSON para descargarlo
    const jsonString = JSON.stringify(this.convertedJson, null, 2);

    console.log('jsonSting')
    console.log(jsonString)
    // this.convertToGoJSModel(jsonString);
    console.log(this.convertToGoJSModel(jsonString));
    console.log('terminó'); 
  
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
