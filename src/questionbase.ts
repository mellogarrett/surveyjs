﻿import {Base, SurveyElement, IQuestion, IConditionRunner, ISurveyData, ISurvey, HashTable, Event, SurveyError} from './base';
import {QuestionCustomWidget} from './questionCustomWidgets';
import {JsonObject} from './jsonobject';
import {ConditionRunner} from './conditions';
import {ILocalizableOwner} from "./localizablestring";
import {surveyCss} from "./defaultCss/cssstandard";
import {CustomWidgetCollection} from './questionCustomWidgets';

/**
 * A base class for all questions. QuestionBase doesn't have information about title, values, errors and so on.
 * Those properties are defined in the Question class.
 */
export class QuestionBase extends SurveyElement implements IQuestion, IConditionRunner, ILocalizableOwner {
    private static questionCounter = 100;
    private static getQuestionId(): string {
        return "sq_" + QuestionBase.questionCounter++;
    }
    private conditionRunner: ConditionRunner = null;
    private isCustomWidgetRequested: boolean = false;
    private customWidgetValue: QuestionCustomWidget;
    customWidgetData = { isNeedRender: true };
    /**
     * The event is fired when the survey change it's locale
     * @see SurveyModel.locale
     */
    public localeChanged: Event<(sender: QuestionBase) => any, any> = new Event<(sender: QuestionBase) => any, any>();
    focusCallback: () => void;
    renderWidthChangedCallback: () => void;
    rowVisibilityChangedCallback: () => void;
    startWithNewLineChangedCallback: () => void;
    visibilityChangedCallback: () => void;
    visibleIndexChangedCallback: () => void;
    readOnlyChangedCallback: () => void;
    surveyLoadCallback: () => void;

    constructor(public name: string) {
        super();
        this.id = QuestionBase.getQuestionId();
        this.onCreating();
    }
    public getType(): string { return "questionbase"; }
    /**
     * Always returns false.
     */
    public get isPanel(): boolean { return false; }
    /**
     * Use it to get/set the question visibility.
     * @see visibleIf
     */
    public get visible(): boolean { return this.getPropertyValue("visible", true); }
    public set visible(val: boolean) {
        if (val == this.visible) return;
        this.setPropertyValue("visible", val);
        this.fireCallback(this.visibilityChangedCallback);
        this.fireCallback(this.rowVisibilityChangedCallback);
        if (this.survey) {
            this.survey.questionVisibilityChanged(<IQuestion>this, this.visible);
        }
    }
    /**
     * An expression that returns true or false. If it returns true the Question becomes visible and if it returns false the Question becomes invisible. The library runs the expression on survey start and on changing a question value. If the property is empty then visible property is used.
     * @see visible
     */
    public get visibleIf(): string { return this.getPropertyValue("visibleIf", ""); }
    public set visibleIf(val: string) { this.setPropertyValue("visibleIf", val); }
    /**
     * Returns true if the question is visible or survey is in design mode right now.
     */
    public get isVisible(): boolean { return this.visible || this.isDesignMode; }
    /**
     * Returns true if the question in design mode right now.
     */
    public get isDesignMode(): boolean { return this.survey && this.survey.isDesignMode; }
    /**
     * Returns true if there is no input in the question. It always returns true for html question or survey is in 'display' mode.
     * @see QuestionHtmlModel
     * @see SurveyModel.mode
     * @see Question.readOnly
     */
    public get isReadOnly() { return true; }
    /**
     * Returns the visible index of the question in the survey. It can be from 0 to all visible questions count - 1
     */
    public get visibleIndex(): number { return this.getPropertyValue("visibleIndex", -1); }
    /**
     * Returns true if there is at least one error on question validation.
     * @param fireCallback set it to true to show error in UI
     */
    public hasErrors(fireCallback: boolean = true): boolean { return false; }
    /**
     * Returns the number of erros on validation.
     */
    public get currentErrorCount(): number { return 0; }
    /**
     * Returns false if the question doesn't have a title property, for example: QuestionHtmlModel
     */
    public get hasTitle(): boolean { return false; }
    /**
     * Returns false if the question doesn't have a description property, for example: QuestionHtmlModel, or description property is empty.
     */
    public get hasDescription(): boolean { return false; }
    /**
     * Returns false if the question doesn't have an input element, for example: QuestionHtmlModel
     */
    public get hasInput(): boolean { return false; }
    /**
     * Returns true, if you can have a comment for the question.
     */
    public get hasComment(): boolean { return false; }
    /**
     * The unique identificator. It is generated automatically. 
     */
    public get id(): string { return this.getPropertyValue("id"); }
    public set id(val: string) { this.setPropertyValue("id", val); }
    /**
     * Returns the list of errors that has in the question. For example, isRequired error.
     */
    public getAllErrors(): Array<SurveyError> { return []; }
    /**
     * The link to the custom widget.
     */
    public get customWidget(): QuestionCustomWidget { 
        if(!this.isCustomWidgetRequested && !this.customWidgetValue) {
            this.isCustomWidgetRequested = true;    
            this.updateCustomWidget();
        }
        return this.customWidgetValue; 
    }
    public updateCustomWidget() {
        this.customWidgetValue = CustomWidgetCollection.Instance.getCustomWidget(this);
    }
    /**
     * The Question renders on the new line if the property is true. If the property is false, the question tries to render on the same line/row with a previous question/panel.
     */
    public get startWithNewLine(): boolean { return this.getPropertyValue("startWithNewLine", true); }
    public set startWithNewLine(val: boolean) {
        if(this.startWithNewLine == val) return;
        this.setPropertyValue("startWithNewLine", val);
        if(this.startWithNewLineChangedCallback) this.startWithNewLineChangedCallback();
    }
    /**
     * Returns all css classes that used for rendering the question. You may use survey.updateQuestionCssClasses event to override css classes for a question.
     * @see SurveyModel.updateQuestionCssClasses
     */
    public get cssClasses(): any {
        var surveyCss = this.css;
        var classes = { error : {}};
        this.copyCssClasses(classes, surveyCss.question);
        this.copyCssClasses(classes.error, surveyCss.error);
        this.updateCssClasses(classes, surveyCss);
        if(this.survey) {
            this.survey.updateQuestionCssClasses(this, classes);
        }
        return classes;
    }
    protected getRootCss(classes: any) { return classes.question.root; }
    protected updateCssClasses(res: any, surveyCss: any) { 
        var objCss = surveyCss[this.getType()];
        if (objCss === undefined || objCss === null) return;
        if (typeof objCss === 'string' || objCss instanceof String) {
            res.root = objCss;
        } else {
            for(var key in objCss) {
                res[key] = objCss[key];
            }
        }
    }
    private copyCssClasses(dest: any, source: any) {
        if(!source) return;
        if (typeof source === 'string' || source instanceof String) {
            dest["root"] = source;
        } else {
            for(var key in source) {
                dest[key] = source[key];
            }
        }
    }
    private get css(): any { return surveyCss.getCss(); }
    /**
     * Use it to set the specific width to the question.
     */
    public get width() : string { return this.getPropertyValue("width", ""); }
    public set width(val: string) { this.setPropertyValue("width", val); }
    /**
     * The rendered width of the question.
     */
    public get renderWidth(): string { return this.getPropertyValue("renderWidth", ""); }
    public set renderWidth(val: string) {
        if (val == this.renderWidth) return;
        this.setPropertyValue("renderWidth", val);
        this.fireCallback(this.renderWidthChangedCallback);
    }
    /**
     * Set it different from 0 to increase the left padding.
     */
    public get indent(): number { return this.getPropertyValue("indent", 0); }
    public set indent(val: number) {
        if (val == this.indent) return;
        this.setPropertyValue("indent", val);
        this.fireCallback(this.renderWidthChangedCallback);
    }
    /**
     * Set it different from 0 to increase the right padding.
     */
    public get rightIndent(): number { return this.getPropertyValue("rightIndent", 0); }
    public set rightIndent(val: number) {
        if (val == this.rightIndent) return;
        this.setPropertyValue("rightIndent", val);
        this.fireCallback(this.renderWidthChangedCallback);
    }
    /**
     * Focus the question input.
     * @param onError Focus if there is an error.
     */
    public focus(onError: boolean = false) { }
    protected fireCallback(callback: () => void) {
        if (callback) callback();
    }
    protected onCreating() { }
    /**
     * Run visibleIf and enableIf expressions. If visibleIf or/and enabledIf are not empty, then the results of performing the expression (true or false) set to the visible/readOnly properties.
     * @param values Typically survey results
     * @see visible
     * @see visibleIf
     * @see readOnly
     * @see enableIf
     */
    public runCondition(values: HashTable<any>) {
        if (!this.visibleIf) return;
        if (!this.conditionRunner) this.conditionRunner = new ConditionRunner(this.visibleIf);
        this.conditionRunner.expression = this.visibleIf;
        this.visible = this.conditionRunner.run(values);
    }
    //IQuestion
    public onSurveyValueChanged(newValue: any) {
    }
    public onSurveyLoad() {
        this.fireCallback(this.surveyLoadCallback);
    }
    public setVisibleIndex(val: number): number {
        if (this.visibleIndex == val) return 1;
        this.setPropertyValue("visibleIndex", val);
        this.fireCallback(this.visibleIndexChangedCallback);
        return 1;
    }
    public supportGoNextPageAutomatic() { return false; }
    public clearUnusedValues() {}
    public get displayValue(): any {
        return "";
    }
    public onLocaleChanged() {
        this.localeChanged.fire(this, this.getLocale());
    }
    onReadOnlyChanged() {}
    onAnyValueChanged(name: string){}
    //ILocalizableOwner
    /**
     * Returns the current survey locale
     * @see SurveyModel.locale
     */
    public getLocale(): string { return this.survey ? (<ILocalizableOwner><any>this.survey).getLocale() : ""; }
    public getMarkdownHtml(text: string)  { return this.survey ? (<ILocalizableOwner><any>this.survey).getMarkdownHtml(text) : null; }
}
JsonObject.metaData.addClass("questionbase", ["!name", { name: "visible:boolean", default: true }, "visibleIf:expression",
    { name: "width" }, { name: "startWithNewLine:boolean", default: true}, {name: "indent:number", default: 0, choices: [0, 1, 2, 3]}]);
