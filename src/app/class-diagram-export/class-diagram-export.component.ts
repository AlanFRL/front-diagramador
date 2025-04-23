import { Component,Input } from '@angular/core';
import { create } from 'xmlbuilder2'

@Component({
  selector: 'app-class-diagram-export',
  templateUrl: './class-diagram-export.component.html',
  styleUrls: ['./class-diagram-export.component.css']
})
export class ClassDiagramExportComponent {
  @Input() model: string = '';
  
  xmiDocument: string;

  constructor() {
    this.xmiDocument = '';
  }

  convertToXMI(jsonDiagram: any): string {
    // Crea el documento XML con la estructura XMI
    const doc = create({ version: '1.0' })
      .ele('XMI', { 'xmlns:UML': 'omg.org/UML1.3', 'xmi.version': '1.1' })
        .ele('XMI.header')
          .ele('XMI.documentation')
            .ele('XMI.exporter').txt('Enterprise Architect').up()
              .ele('XMI.exporterVersion').txt('2.5').up()
          .up()
        .up()
        .ele('XMI.content');
     const model= doc.ele('UML:Model', { 'xmi.id': 'model1', 'name': 'EA Model','visibility': 'public' })
                       .ele('UML:Namespace.ownedElement')
                          .ele('UML:Package',{'name':'classdiagram','xmi.id':'diagram','visibility':'public'})
                            .ele('UML:Namespace.ownedElement');

     const graphic = doc.ele('UML:Diagram',{'name':'classdiagram','xmi.id':'graphic','diagramType':'ClassDiagram','owner':'diagram','toolName':'Enterprise Architect 2.5'})
     const tagged =graphic.ele('UML:ModelElement.taggedValue')
     tagged.ele('UML:TaggedValue', {
      'tag': 'package',
      'value': 'diagram'
      });
      tagged.ele('UML:TaggedValue', {
        'tag': 'type',
        'value': 'Logical'
      });
      tagged.ele('UML:TaggedValue', {
        'tag': 'swimlanes',
        'value': 'locked=false;orientation=0;width=0;inbar=false;names=false;color=-1;bold=false;fcol=0;tcol=-1;ofCol=-1;ufCol=-1;hl=0;ufh=0;cls=0;SwimlaneFont=lfh:-16,lfw:0,lfi:0,lfu:0,lfs:0,lfface:Calibri,lfe:0,lfo:0,lfchar:1,lfop:0,lfcp:0,lfq:0,lfpf=0,lfWidth=0'
      });
      tagged.ele('UML:TaggedValue', {
        'tag': 'matrixitems',
        'value': 'locked=false;matrixactive=false;swimlanesactive=true;kanbanactive=false;width=1;clrLine=0;'
      });
      tagged.ele('UML:TaggedValue', {
        'tag': 'EAStyle',
        'value': 'ShowPrivate=1;ShowProtected=1;ShowPublic=1;HideRelationships=0;Locked=0;Border=1;HighlightForeign=1;PackageContents=1;SequenceNotes=0;ScalePrintImage=0;PPgs.cx=1;PPgs.cy=1;DocSize.cx=827;DocSize.cy=1169;ShowDetails=0;Orientation=P;Zoom=100;ShowTags=0;OpParams=1;VisibleAttributeDetail=0;ShowOpRetType=1;ShowIcons=1;CollabNums=0;HideProps=0;ShowReqs=0;ShowCons=0;PaperSize=9;HideParents=0;UseAlias=0;HideAtts=0;HideOps=0;HideStereo=0;HideElemStereo=0;ShowTests=0;ShowMaint=0;ConnectorNotation=UML 2.1;ExplicitNavigability=0;ShowShape=1;AdvancedElementProps=1;AdvancedFeatureProps=1;AdvancedConnectorProps=1;m_bElementClassifier=1;ShowNotes=0;SuppressBrackets=0;SuppConnectorLabels=0;PrintPageHeadFoot=0;ShowAsList=0;'
      });
      tagged.ele('UML:TaggedValue', {
        'tag': 'styleex',
        'value': 'SaveTag=E24430D2;ExcludeRTF=0;DocAll=0;HideQuals=0;AttPkg=1;ShowTests=0;ShowMaint=0;SuppressFOC=1;MatrixActive=0;SwimlanesActive=1;KanbanActive=0;MatrixLineWidth=1;MatrixLineClr=0;MatrixLocked=0;TConnectorNotation=UML 2.1;TExplicitNavigability=0;AdvancedElementProps=1;AdvancedFeatureProps=1;AdvancedConnectorProps=1;m_bElementClassifier=1;ProfileData=;MDGDgm=;STBLDgm=;ShowNotes=0;VisibleAttributeDetail=0;ShowOpRetType=1;SuppressBrackets=0;SuppConnectorLabels=0;PrintPageHeadFoot=0;ShowAsList=0;SuppressedCompartments=;Theme=:119;'
      });

    const graphicelement=graphic.ele('UML:Diagram.element')
    

    // Procesar las clases (nodeDataArray)
    let i=0;
    jsonDiagram.nodeDataArray.forEach((node: any) => {
      if(node.category==null){
      i++;
      const classElement = model.ele('UML:Class', { 'xmi.id': `class${node.key}`, 'name': node.name, 'visibility': 'public','namespace':'diagram' });

      // Agregar el bloque UML:Classifier.feature para los atributos
    const classifierFeature = classElement.ele('UML:Classifier.feature');
     // Agregar el bloque UML:ModelElement.taggedValue
     const taggedValue = classElement.ele('UML:ModelElement.taggedValue');
    
     taggedValue.ele('UML:TaggedValue', {
       'tag': 'ea_stype',
       'value': 'Class'
     });
 
     taggedValue.ele('UML:TaggedValue', {
       'tag': 'package',
       'value': 'diagram'
     });
 
     taggedValue.ele('UML:TaggedValue', {
       'tag': 'package_name',
       'value': 'classdiagram'
     });
 
     taggedValue.ele('UML:TaggedValue', {
       'tag': 'style',
       'value': 'BackColor=-1;BorderColor=-1;BorderWidth=-1;FontColor=-1;VSwimLanes=1;HSwimLanes=1;BorderStyle=0;'
     });

      // Añadir las propiedades de la clase
      node.properties.forEach((property: any) => {
        const attributeElement = classifierFeature.ele('UML:Attribute', {
          'name': property.name,
          'visibility': property.visibility
        });
        attributeElement.ele('UML:TaggedValue', {
          'tag': 'type',
          'value': property.type
        });
      });
  

      // Añadir los métodos (en este caso, vacío)
      node.methods.forEach((method: any) => {
        classElement.ele('UML:Operation', {
          'xmi.id': `meth${node.key}_${method.name}`,
          'name': method.name,
          'visibility': method.visibility
        });
      });

      const right=node.x+90;
      const bottom=node.y+70;
      //añadir al grafico
       graphicelement.ele('UML:DiagramElement',
        {
          'geometry':`Left=${node.x};Top=${node.y};Right=${right};Bottom=${bottom};`,
          'subject':`class${node.key}`,
          'seqno':`${i}`
        }
       )
      }
    });
    let relacionelement:any;
    // Procesar las relaciones (linkDataArray)
    let from='';
    let to='';
    let associationclass='';
    jsonDiagram.linkDataArray.forEach((link: any) => {
      if(link.type=='nton'){
         to = link.labelKeys
        //  console.log(to[0])
        jsonDiagram.linkDataArray.forEach((link: any) => {
          if(link.type=='Conector' && link.to==to[0] ){
            associationclass=link.from;
          }
        });
      }
    // if(link.type=='nton' && to!=link.to){
    //     from=link.from;
    //     to=link.to;
    // }else {
    //   if(link.type=='nton'){
    //     associationclass=link.to;
    //     link.to=from;
    //     link.toCardinality='';
    //   }
    if (link.relationship=='Generalization'){
      relacionelement= model.ele('UML:Generalization', {
        'subtype':`class${link.from}`,
        'supertype':`class${link.to}`,
        'xmi.id': `assoc${link.from}_${link.to}`,
        'visibility':'public'
      });
    }else{
      relacionelement= model.ele('UML:Association', {
        'xmi.id': `assoc${link.from}_${link.to}`,
        'visibility':'public'
      });
    }
    const taggedValue = relacionelement.ele('UML:ModelElement.taggedValue');
    taggedValue.ele('UML:TaggedValue', {
      'tag': 'style',
      'value': '3'
    });
    taggedValue.ele('UML:TaggedValue', {
      'tag': 'linemode',
      'value': '3'
    });
    taggedValue.ele('UML:TaggedValue', {
      'tag': 'linecolor',
      'value': '-1'
    });
    taggedValue.ele('UML:TaggedValue', {
      'tag': 'linewidth',
      'value': '0'
    });
    taggedValue.ele('UML:TaggedValue', {
      'tag': 'seqno',
      'value': '0'
    });
    taggedValue.ele('UML:TaggedValue', {
      'tag': 'headStyle',
      'value': '0'
    });
    taggedValue.ele('UML:TaggedValue', {
      'tag': 'lineStyle',
      'value': '0'
    });
    taggedValue.ele('UML:TaggedValue', {
      'tag': 'virtualInheritance',
      'value': '0'
    });
     if(link.relationship!='Association'){ 
      taggedValue.ele('UML:TaggedValue', {
        'tag': 'direction',
        'value': 'Source -&gt; Destination'
      });       
     }else{
      taggedValue.ele('UML:TaggedValue', {
        'tag': 'direction',
        'value': 'Unspecified'
      });
     }
     if(link.relationship=='Composite'){
      taggedValue.ele('UML:TaggedValue', {
        'tag': 'ea_type',
        'value': 'Aggregation'
      });  
     }else{
      taggedValue.ele('UML:TaggedValue', {
        'tag': 'ea_type',
        'value': `${link.relationship}`
      });  
     }
     if(link.type=='nton'){
      taggedValue.ele('UML:TaggedValue', {
        'tag': 'subtype',
        'value': 'Class'
      });
      taggedValue.ele('UML:TaggedValue', {
        'tag': 'associationclass',
        'value': `class${associationclass}`
      });
     }
     
    
    if(link.relationship!='Generalization'){
    const connectionelement=relacionelement.ele('UML:Association.connection');
       connectionelement.ele('UML:AssociationEnd',{'type':`class${link.to}`,'isNavigable':'true','multiplicity':`${link.toCardinality}`});
       if(link.relationship=='Composition'){
       connectionelement.ele('UML:AssociationEnd',{'type':`class${link.from}`,'multiplicity':`${link.fromCardinality}`,isNavigable:'true','aggregation':'composite'});
       }else{
        connectionelement.ele('UML:AssociationEnd',{'type':`class${link.from}`,'multiplicity':`${link.fromCardinality}`,'isNavigable':'true'});
       }
       graphicelement.ele('UML:DiagramElement',
        {
          'geometry':'SX=0;SY=0;EX=0;EY=0;EDGE=2;$LLB=;LLT=;LMT=;LMB=;LRT=;LRB=;IRHS=;ILHS=;Path=;',
          'subject': `assoc${link.from}_${link.to}`  
        }
       )
    }
  }
  );  
    return  doc.end({ prettyPrint: true });
  }
  downloadXMI() {
    console.log(`${this.model}`)
    const xmiContent = this.convertToXMI(this.model);
    console.log(`fin${xmiContent}`)
    // Crea un blob con el contenido del XMI
    const blob = new Blob([xmiContent], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);

    // Crea un enlace temporal para descargar el archivo
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class_diagram.xmi';  // Nombre del archivo
    a.click();

    // Libera el objeto URL
    window.URL.revokeObjectURL(url);
  }
}
