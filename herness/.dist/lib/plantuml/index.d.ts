import { DesignArtifacts, DiagramType, DiagramOutput } from '../../shared/types';
export declare class PlantUMLAgent {
    private featuresDir;
    constructor(featuresDir: string);
    generate(featureName: string, artifacts: DesignArtifacts, types?: DiagramType[]): Promise<DiagramOutput[]>;
    private generateClassDiagram;
    private generateSequenceDiagram;
    private generateComponentDiagram;
    private generateUseCaseDiagram;
    private generateActivityDiagram;
}
//# sourceMappingURL=index.d.ts.map