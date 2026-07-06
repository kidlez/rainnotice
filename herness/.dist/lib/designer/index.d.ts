import { Task, DesignQuestion, DesignArtifacts, QuestionCategory, TestPlan } from '../../shared/types';
import { Guard } from '../guard';
export declare class Designer {
    private featuresDir;
    private guard?;
    private interview?;
    private agentId;
    constructor(featuresDir: string, guard?: Guard | undefined);
    startInterview(featurePath: string, tasks: Task[]): Promise<DesignQuestion[]>;
    getOpenQuestions(): DesignQuestion[];
    getResolvedQuestions(): DesignQuestion[];
    getQuestionsByCategory(category: QuestionCategory): DesignQuestion[];
    answerQuestion(questionId: string, answer: string): DesignQuestion[];
    isReadyToFinalize(): {
        ready: boolean;
        missingCategories: string[];
    };
    finalize(): Promise<DesignArtifacts>;
    generateTestPlan(acceptanceCriteria: string[], featureContent: string): TestPlan;
    askQuestion(questionId: string): Promise<string>;
    interviewSummary(): string;
    goToNextRound(): DesignQuestion[];
    private generateInitialQuestions;
    private getSeedQuestions;
    private generateFollowUpQuestions;
    private generateDeepDiveQuestions;
    private generateTypesFromAnswers;
    private inferFieldType;
    private camelCase;
    private extractModulesFromAnswers;
    private extractInterfacesFromAnswers;
    private collectEdgeCases;
    private buildDesignDoc;
    private createTestCaseFromAC;
    private parseImplementationKeywords;
    private extractDependencies;
    private parseAcceptanceCriteria;
    design(featurePath: string, tasks: Task[]): Promise<{
        designDoc: string;
        types: string;
        modules: string[];
        interfaces: string[];
        edgeCases: string[];
        testPlan: TestPlan;
    }>;
}
//# sourceMappingURL=index.d.ts.map