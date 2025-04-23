import { Component, Input } from '@angular/core';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Define interfaces para el modelo
let mayores: { [key: string]: any } = {};
interface Property {
  name: string;
  type: string;
  visibility: string;
}

interface Node {
  key: number;
  name: string;
  type: string;
  properties: Property[];
  x: number;
  y: number;
}

interface Link {
  from: number;
  to: number;
  relationship: string;
  type: string;
  fromCardinality?: string;
  toCardinality?: string;
  labelKeys?: number[];
}

@Component({
  selector: 'app-code-generation',
  templateUrl: './code-generation.component.html',
  styleUrls: ['./code-generation.component.css'],
})
export class CodeGenerationComponent {
  @Input() model: string = ''; // Modelo JSON como string

  constructor() {}

  generateCode() {
    if (!this.model) {
      console.error('El modelo JSON no está definido.');
      return [];
    }

    console.log('Iniciando la generación de código...');
    console.log('Modelo recibido:', this.model);

    let parsedModel: { nodeDataArray: Node[]; linkDataArray: Link[] };
    try {
      parsedModel = JSON.parse(this.model); // Parsear el string JSON a objeto
    } catch (error) {
      console.error('Error al parsear el modelo JSON:', error);
      return [];
    }

    const { nodeDataArray, linkDataArray } = parsedModel;

    if (!nodeDataArray || !linkDataArray) {
      console.error('El modelo no contiene nodos ni enlaces.');
      return [];
    }

    const classes = this.processClasses(nodeDataArray);
    const associations = this.processAssociations(linkDataArray);

    if (classes.length === 0) {
      console.error('No se encontraron clases en el modelo.');
      return [];
    }

    console.log('Clases procesadas:', classes);
    console.log('Relaciones procesadas:', associations);

    const files = this.generateFiles(classes, associations);

    console.log('Archivos generados:', files);
    return files;
  }

  processClasses(nodeDataArray: Node[]): {
    id: number;
    name: string;
    type: string;
    attributes: Property[];
    position: { x: number; y: number };
  }[] {
    return nodeDataArray
      .filter(
        (node: Node) =>
          node.type === 'Class' || node.type === 'AssociationClass'
      )
      .map((node: Node) => ({
        id: node.key,
        name: node.name,
        type: node.type,
        attributes: node.properties.filter((prop) => prop.name !== 'id'), // Ignorar duplicados de "id"
        position: { x: node.x, y: node.y },
      }));
  }

  processAssociations(linkDataArray: Link[]): {
    from: number;
    to: number;
    type: string;
    fromCardinality: string;
    toCardinality: string;
    associationClass?: number | null;
  }[] {
    return linkDataArray
      .filter((link) => link.type !== 'Conector')
      .map((link: Link) => {
        if (link.type === 'nton') {
          const associationClassId = this.findAssociationClass(
            link.labelKeys,
            linkDataArray
          );
          return {
            from: link.from,
            to: link.to,
            type: link.type,
            fromCardinality: link.fromCardinality || '',
            toCardinality: link.toCardinality || '',
            associationClass: associationClassId,
          };
        } else {
          return {
            from: link.from,
            to: link.to,
            type: link.type,
            fromCardinality: link.fromCardinality || '',
            toCardinality: link.toCardinality || '',
          };
        }
      });
  }

  findAssociationClass(
    labelKeys: number[] | undefined,
    linkDataArray: Link[]
  ): number | null {
    if (!labelKeys || labelKeys.length === 0) return null;

    const labelKey = labelKeys[0];
    const connector = linkDataArray.find(
      (link) => link.type === 'Conector' && link.to === labelKey
    );

    return connector ? connector.from : null;
  }

  generateFiles(classes: any[], associations: any[]) {
    const files: { path: string; content: string }[] = [];

    classes.forEach((cls) => {
      const className = this.capitalize(cls.name);

      // Generar entidades
      files.push({
        path: `entities/${className}.java`,
        content: this.generateEntityCode(cls, associations),
      });

      // Generar repositorios
      files.push({
        path: `repositories/${className}Repository.java`,
        content: this.generateRepositoryCode(className),
      });

      // Generar servicios
      files.push({
        path: `services/${className}Service.java`,
        content: this.generateServiceCode(className, cls, associations),
      });

      // Generar controladores
      files.push({
        path: `controllers/${className}Controller.java`,
        content: this.generateControllerCode(className),
      });
    });

    return files;
  }

  generateEntityCode(cls: any, associations: any[]) {
    let cabecera = `
    @Entity
    public class ${cls.name} {
    `;

    let getsetextras = '';

    const attributes = cls.attributes
      .map(
        (attr: Property) => `
    @Column
    private ${this.mapType(attr.type)} ${this.camelCase(attr.name)};
    `
      )
      .join('');

    const relationships = associations
      .filter(
        (assoc) =>
          assoc.from === cls.id ||
          assoc.to === cls.id ||
          assoc.associationClass === cls.id
      )
      .map((assoc) => {
        if (assoc.associationClass !== cls.id) {
          const isOwner = assoc.from === cls.id;
          const relatedClassId = isOwner ? assoc.to : assoc.from;
          const relatedClassName = this.findClassNameById(relatedClassId);

          if (assoc.type === 'nton') {
            const associationClassName = this.findClassNameById(assoc.associationClass);
            getsetextras += `
        public List<${associationClassName}> get${this.capitalize(associationClassName)}s() {
            return ${associationClassName.toLowerCase()}s;
        }

        public void set${this.capitalize(associationClassName)}s(List<${associationClassName}> ${associationClassName.toLowerCase()}s) {
            this.${associationClassName.toLowerCase()}s = ${associationClassName.toLowerCase()}s;
        }
        \n`;
            return `
    @OneToMany(mappedBy = "${cls.name.toLowerCase()}")
    @JsonManagedReference("${cls.name}-${associationClassName}")
    private List<${associationClassName}> ${associationClassName.toLowerCase()}s;
    `;
          } else if (assoc.type === 'Composition') {
            if (isOwner) {
              getsetextras += `
        public List<${relatedClassName}> get${this.capitalize(relatedClassName)}s() {
            return ${relatedClassName.toLowerCase()}s;
        }

        public void set${this.capitalize(relatedClassName)}s(List<${relatedClassName}> ${relatedClassName.toLowerCase()}s) {
            this.${relatedClassName.toLowerCase()}s = ${relatedClassName.toLowerCase()}s;
        }
        \n`;
              return `
    @OneToMany(mappedBy = "${cls.name.toLowerCase()}", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
    private List<${relatedClassName}> ${relatedClassName.toLowerCase()}s;
    `;
            } else {
              getsetextras += `
        public ${relatedClassName} get${this.capitalize(relatedClassName)}() {
            return ${relatedClassName.toLowerCase()};
        }

        public void set${this.capitalize(relatedClassName)}(${relatedClassName} ${relatedClassName.toLowerCase()}) {
            this.${relatedClassName.toLowerCase()} = ${relatedClassName.toLowerCase()};
        }
        \n`;
              return `
    @ManyToOne
    @JoinColumn(
      name = "${relatedClassName.toLowerCase()}_id",
      nullable = false
    )
    @JsonBackReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
    private ${relatedClassName} ${relatedClassName.toLowerCase()};
    `;
            }
          } else if (assoc.type === 'Aggregation') {
            if (isOwner) {
              getsetextras += `
        public List<${relatedClassName}> get${this.capitalize(relatedClassName)}s() {
            return ${relatedClassName.toLowerCase()}s;
        }

        public void set${this.capitalize(relatedClassName)}s(List<${relatedClassName}> ${relatedClassName.toLowerCase()}s) {
            this.${relatedClassName.toLowerCase()}s = ${relatedClassName.toLowerCase()}s;
        }
        \n`;
              return `
    @OneToMany
    @JoinColumn(name = "${relatedClassName.toLowerCase()}_id")
    @JsonBackReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
    private List<${relatedClassName}> ${relatedClassName.toLowerCase()}s;
    `;
            } else {
              getsetextras += `
        public ${relatedClassName} get${this.capitalize(relatedClassName)}() {
            return ${relatedClassName.toLowerCase()};
        }

        public void set${this.capitalize(relatedClassName)}(${relatedClassName} ${relatedClassName.toLowerCase()}) {
            this.${relatedClassName.toLowerCase()} = ${relatedClassName.toLowerCase()};
        }
        \n`;
              return `
    @ManyToOne
    @JoinColumn(
      name = "${relatedClassName.toLowerCase()}_id",
      nullable = true
    )
    @JsonBackReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
    private ${relatedClassName} ${relatedClassName.toLowerCase()};
    `;
            }
          } else if (assoc.type === 'Generalization') {
            if (isOwner) {
              cabecera = `
    @Entity
    public class ${cls.name} extends ${relatedClassName} {
    `;
            } else {
              cabecera = `
    @Entity
    @Inheritance(strategy = InheritanceType.JOINED)
    public class ${cls.name} {
    `;
            }
          } else if (assoc.type === 'Association') {
        
              if (assoc.fromCardinality === '1' && assoc.toCardinality === '0..1') {
                if (isOwner) {
                  return `
        @OneToOne(mappedBy = "${cls.name.toLowerCase()}")
        @JsonManagedReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private ${relatedClassName} ${relatedClassName.toLowerCase()};
        `;
                } else {
                  getsetextras += `
        public ${relatedClassName} get${this.capitalize(relatedClassName)}() {
            return ${relatedClassName.toLowerCase()};
        }

        public void set${this.capitalize(relatedClassName)}(${relatedClassName} ${relatedClassName.toLowerCase()}) {
            this.${relatedClassName.toLowerCase()} = ${relatedClassName.toLowerCase()};
        }
        \n`;
                  return `
        @OneToOne
        @JoinColumn(name = "${relatedClassName.toLowerCase()}_id", nullable = true)
        @JsonBackReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private ${relatedClassName} ${relatedClassName.toLowerCase()};
        `;
                }
              } else if (assoc.fromCardinality === '0..1' && assoc.toCardinality === '1') {
                if (isOwner) {
                  getsetextras += `
        public ${relatedClassName} get${this.capitalize(relatedClassName)}() {
            return ${relatedClassName.toLowerCase()};
        }

        public void set${this.capitalize(relatedClassName)}(${relatedClassName} ${relatedClassName.toLowerCase()}) {
            this.${relatedClassName.toLowerCase()} = ${relatedClassName.toLowerCase()};
        }
        \n`;
                  return `
        @OneToOne
        @JoinColumn(name = "${relatedClassName.toLowerCase()}_id", nullable = true)
        @JsonBackReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private ${relatedClassName} ${relatedClassName.toLowerCase()};
        `; 
                } else {
                  return `
        @OneToOne(mappedBy = "${cls.name.toLowerCase()}")
        @JsonManagedReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private ${relatedClassName} ${relatedClassName.toLowerCase()};
        `;
                }
              } else if (assoc.fromCardinality === '1' && assoc.toCardinality === '1') {
                if (`${relatedClassName}` in mayores) {
                  getsetextras += `
        public ${relatedClassName} get${this.capitalize(relatedClassName)}() {
            return ${relatedClassName.toLowerCase()};
        }

        public void set${this.capitalize(relatedClassName)}(${relatedClassName} ${relatedClassName.toLowerCase()}) {
            this.${relatedClassName.toLowerCase()} = ${relatedClassName.toLowerCase()};
        }
        \n`;
                  return `
        @OneToOne
        @JoinColumn(name = "${relatedClassName.toLowerCase()}_id")
        @JsonBackReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private ${relatedClassName} ${relatedClassName.toLowerCase()};
        `;
                } else {
                  mayores[`${cls.name}`] = true;
                  return `
        @OneToOne(mappedBy = "${cls.name.toLowerCase()}")
        @JsonManagedReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private ${relatedClassName} ${relatedClassName.toLowerCase()};
        `;
                }
              } else if (assoc.fromCardinality === '1' && assoc.toCardinality.includes('*')) {
                if (isOwner) {
                  getsetextras += `
        public List<${relatedClassName}> get${this.capitalize(relatedClassName)}s() {
            return ${relatedClassName.toLowerCase()}s;
        }

        public void set${this.capitalize(relatedClassName)}s(List<${relatedClassName}> ${relatedClassName.toLowerCase()}s) {
            this.${relatedClassName.toLowerCase()}s = ${relatedClassName.toLowerCase()}s;
        }
        \n`;
                  return `
        @OneToMany(mappedBy = "${cls.name.toLowerCase()}", cascade = CascadeType.ALL)
        @JsonManagedReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private List<${relatedClassName}> ${relatedClassName.toLowerCase()}s;
        `;
                } else {
                  getsetextras += `
        public ${relatedClassName} get${this.capitalize(relatedClassName)}() {
            return ${relatedClassName.toLowerCase()};
        }

        public void set${this.capitalize(relatedClassName)}(${relatedClassName} ${relatedClassName.toLowerCase()}) {
            this.${relatedClassName.toLowerCase()} = ${relatedClassName.toLowerCase()};
        }
        \n`;
                  return `
        @ManyToOne
        @JoinColumn(name = "${relatedClassName.toLowerCase()}_id")
        @JsonBackReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private ${relatedClassName} ${relatedClassName.toLowerCase()};
        `;
                }
              } else if (assoc.fromCardinality.includes('*') && assoc.toCardinality === '1') {
                if (isOwner) {
                  getsetextras += `
        public ${relatedClassName} get${this.capitalize(relatedClassName)}() {
            return ${relatedClassName.toLowerCase()};
        }

        public void set${this.capitalize(relatedClassName)}(${relatedClassName} ${relatedClassName.toLowerCase()}) {
            this.${relatedClassName.toLowerCase()} = ${relatedClassName.toLowerCase()};
        }
        \n`;
                  return `
        @ManyToOne
        @JoinColumn(name = "${relatedClassName.toLowerCase()}_id")
        @JsonBackReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private ${relatedClassName} ${relatedClassName.toLowerCase()};
        `;    
                } else {
                  getsetextras += `
        public List<${relatedClassName}> get${this.capitalize(relatedClassName)}s() {
            return ${relatedClassName.toLowerCase()}s;
        }

        public void set${this.capitalize(relatedClassName)}s(List<${relatedClassName}> ${relatedClassName.toLowerCase()}s) {
            this.${relatedClassName.toLowerCase()}s = ${relatedClassName.toLowerCase()}s;
        }
        \n`;
                  return `
        @OneToMany(mappedBy = "${cls.name.toLowerCase()}", cascade = CascadeType.ALL)
        @JsonManagedReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.to)}")
        private List<${relatedClassName}> ${relatedClassName.toLowerCase()}s;
        `;
                }
              }
            
          }
        } else {
          const relatedClassNameFrom = this.findClassNameById(assoc.from);
          const relatedClassNameTo = this.findClassNameById(assoc.to);
          getsetextras += `
        public ${relatedClassNameFrom} get${this.capitalize(relatedClassNameFrom)}() {
            return ${relatedClassNameFrom.toLowerCase()};
        }

        public void set${this.capitalize(relatedClassNameFrom)}(${relatedClassNameFrom} ${relatedClassNameFrom.toLowerCase()}) {
            this.${relatedClassNameFrom.toLowerCase()} = ${relatedClassNameFrom.toLowerCase()};
        }

        public ${relatedClassNameTo} get${this.capitalize(relatedClassNameTo)}() {
            return ${relatedClassNameTo.toLowerCase()};
        }

        public void set${this.capitalize(relatedClassNameTo)}(${relatedClassNameTo} ${relatedClassNameTo.toLowerCase()}) {
            this.${relatedClassNameTo.toLowerCase()} = ${relatedClassNameTo.toLowerCase()};
        }
        \n`;
          return `
    @ManyToOne
    @JoinColumn(
      name = "${relatedClassNameFrom.toLowerCase()}_id",
      nullable = false
    )
    @JsonBackReference("${this.findClassNameById(assoc.from)}-${this.findClassNameById(assoc.associationClass)}")
    private ${relatedClassNameFrom} ${relatedClassNameFrom.toLowerCase()};

    @ManyToOne
    @JoinColumn(
      name = "${relatedClassNameTo.toLowerCase()}_id",
      nullable = false
    )
    @JsonBackReference("${this.findClassNameById(assoc.to)}-${this.findClassNameById(assoc.associationClass)}")
    private ${relatedClassNameTo} ${relatedClassNameTo.toLowerCase()};
    `;
        }
        return '';
      })
      .join('');

    const gettersSetters = cls.attributes
      .map(
        (attr: Property) => `
    public ${this.mapType(attr.type)} get${this.capitalize(attr.name)}() {
        return ${this.camelCase(attr.name)};
    }

    public void set${this.capitalize(attr.name)}(${this.mapType(
          attr.type
        )} ${this.camelCase(attr.name)}) {
        this.${this.camelCase(attr.name)} = ${this.camelCase(attr.name)};
    }
    `
      )
      .join('');

    return `
package com.example.demo.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;

${cabecera}

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    ${attributes}

    ${relationships}

    // Getters and setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }
    ${gettersSetters}

    ${getsetextras}
}
`;
  }

  generateRepositoryCode(entityName: string): string {
    return `
package com.example.demo.repositories;

import com.example.demo.entities.${entityName};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${entityName}Repository extends JpaRepository<${entityName}, Integer> {
}
`;
  }

  generateServiceCode(entityName: string, cls: any, associations: any[]): string {
    let saveLogic = '';
    const dependencies = new Set<string>();

    const relationships = associations
        .filter(
            (assoc) =>
                assoc.from === cls.id ||
                assoc.to === cls.id ||
                assoc.associationClass === cls.id
        )
        .forEach((assoc) => {
            if (assoc.associationClass !== cls.id) {
                const isOwner = assoc.from === cls.id;
                const relatedClassId = isOwner ? assoc.to : assoc.from;
                const relatedClassName = this.findClassNameById(relatedClassId);

                if (assoc.type === 'Composition' || assoc.type === 'Aggregation') {
                    if (!isOwner) {
                        dependencies.add(`${relatedClassName}Repository`);
                        saveLogic += `
        if (entity.get${this.capitalize(relatedClassName)}() != null && entity.get${this.capitalize(relatedClassName)}().getId() != null) {
            ${relatedClassName} ${this.camelCase(relatedClassName)} = ${this.camelCase(relatedClassName)}Repository.findById(entity.get${this.capitalize(relatedClassName)}().getId()).orElse(null);
            if (${this.camelCase(relatedClassName)} != null) {
                entity.set${this.capitalize(relatedClassName)}(${this.camelCase(relatedClassName)});
            } else {
                throw new IllegalArgumentException("El/la ${relatedClassName.toLowerCase()} especificado(a) no existe.");
            }
        }
        `;
                    }
                } else if (assoc.type === 'Association' && !isOwner) {
                    dependencies.add(`${relatedClassName}Repository`);
                    saveLogic += `
        if (entity.get${this.capitalize(relatedClassName)}() != null && entity.get${this.capitalize(relatedClassName)}().getId() != null) {
            ${relatedClassName} ${this.camelCase(relatedClassName)} = ${this.camelCase(relatedClassName)}Repository.findById(entity.get${this.capitalize(relatedClassName)}().getId()).orElse(null);
            if (${this.camelCase(relatedClassName)} != null) {
                entity.set${this.capitalize(relatedClassName)}(${this.camelCase(relatedClassName)});
            } else {
                throw new IllegalArgumentException("El/la ${relatedClassName.toLowerCase()} especificado(a) no existe.");
            }
        }
        `;
                } else if (assoc.type === 'Association' && assoc.fromCardinality === '1' && assoc.toCardinality === '1') {
                    if (`${relatedClassName}` in mayores) {
                        dependencies.add(`${relatedClassName}Repository`);
                        saveLogic += `
        if (entity.get${this.capitalize(relatedClassName)}() != null && entity.get${this.capitalize(relatedClassName)}().getId() != null) {
            ${relatedClassName} ${this.camelCase(relatedClassName)} = ${this.camelCase(relatedClassName)}Repository.findById(entity.get${this.capitalize(relatedClassName)}().getId()).orElse(null);
            if (${this.camelCase(relatedClassName)} != null) {
                entity.set${this.capitalize(relatedClassName)}(${this.camelCase(relatedClassName)});
            } else {
                throw new IllegalArgumentException("El/la ${relatedClassName.toLowerCase()} especificado(a) no existe.");
            }
        }
        `;
                    } else {
                        mayores[`${cls.name}`] = true;
                    }
                }
            }
        });

    const dependencyInjections = Array.from(dependencies)
        .map((dep) => `private final ${dep} ${this.camelCase(dep)};`)
        .join('\n    ');

    const constructorParams = [
        `${entityName}Repository repository`,
        ...Array.from(dependencies).map((dep) => `${dep} ${this.camelCase(dep)}`),
    ].join(', ');

    const constructorAssignments = Array.from(dependencies)
        .map(
            (dep) =>
                `this.${this.camelCase(dep)} = ${this.camelCase(dep)};`
        )
        .join('\n        ');

    return `
package com.example.demo.services;

import com.example.demo.entities.*;
import com.example.demo.repositories.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ${entityName}Service {

    private final ${entityName}Repository repository;
    ${dependencyInjections}

    public ${entityName}Service(${constructorParams}) {
        this.repository = repository;
        ${constructorAssignments}
    }

    public List<${entityName}> findAll() {
        return repository.findAll();
    }

    public ${entityName} save(${entityName} entity) {
        ${saveLogic}
        return repository.save(entity);
    }

    public ${entityName} findById(Integer id) {
        return repository.findById(id).orElse(null);
    }

    public void delete(Integer id) {
        repository.deleteById(id);
    }
}
`;
}


  generateControllerCode(entityName: string): string {
    return `
package com.example.demo.controllers;

import com.example.demo.entities.${entityName};
import com.example.demo.services.${entityName}Service;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/${entityName.toLowerCase()}s")
public class ${entityName}Controller {

    private final ${entityName}Service service;

    public ${entityName}Controller(${entityName}Service service) {
        this.service = service;
    }

    @GetMapping
    public List<${entityName}> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ${entityName} getById(@PathVariable Integer id) {
        return service.findById(id);
    }

    @PostMapping
    public ${entityName} create(@RequestBody ${entityName} entity) {
        return service.save(entity);
    }

    @PutMapping("/{id}")
    public ${entityName} update(@PathVariable Integer id, @RequestBody ${entityName} entity) {
        ${entityName} existing = service.findById(id);
        if (existing != null) {
            entity.setId(id);
            return service.save(entity);
        }
        return null;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Integer id) {
        service.delete(id);
    }
}
`;
  }

  findClassNameById(classId: number): string {
    const cls = JSON.parse(this.model)?.nodeDataArray.find(
      (node: Node) => node.key === classId
    );
    return cls ? cls.name : 'Unknown';
  }

  mapType(type: string): string {
    const typeMap: { [key: string]: string } = {
      int: 'Integer',
      string: 'String',
      date: 'LocalDate',
      boolean: 'Boolean',
      datetime: 'LocalDateTime',
      float: 'Float',
      char: 'Character',
    };
    return typeMap[type] || 'String';
  }

  camelCase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  downloadZip() {
    const files = this.generateCode();
    if (!files || files.length === 0) {
      console.error('No se generaron archivos para el ZIP.');
      return;
    }

    const zip = new JSZip();

    files.forEach((file) => {
      zip.file(file.path, file.content);
    });

    zip
      .generateAsync({ type: 'blob' })
      .then((content) => {
        saveAs(content, 'springboot_code.zip');
      })
      .catch((err) => {
        console.error('Error al generar el ZIP:', err);
      });
  }
}
