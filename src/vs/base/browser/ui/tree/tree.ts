/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/base/common/event';
import { Iterator } from 'vs/base/common/iterator';
import { IListRenderer, AbstractListRenderer } from 'vs/base/browser/ui/list/list';

export const enum TreeVisibility {

	/**
	 * The tree node should be hidden.
	 */
	Hidden,

	/**
	 * The tree node should be visible.
	 */
	Visible,

	/**
	 * The tree node should be visible if any of its descendants is visible.
	 */
	Recurse
}

/**
 * A composed filter result containing the visibility result as well as
 * metadata.
 */
export interface ITreeFilterDataResult<TFilterData> {

	/**
	 * Whether the node should be visibile.
	 */
	visibility: boolean | TreeVisibility;

	/**
	 * Metadata about the element's visibility which gets forwarded to the
	 * renderer once the element gets rendered.
	 */
	data: TFilterData;
}

/**
 * The result of a filter call can be a boolean value indicating whether
 * the element should be visible or not, a value of type `TreeVisibility` or
 * an object composed of the visibility result as well as additional metadata
 * which gets forwarded to the renderer once the element gets rendered.
 */
export type TreeFilterResult<TFilterData> = boolean | TreeVisibility | ITreeFilterDataResult<TFilterData>;

/**
 * A tree filter is responsible for controlling the visibility of
 * elements in a tree.
 */
export interface ITreeFilter<T, TFilterData = void> {

	/**
	 * Returns whether this elements should be visible and, if affirmative,
	 * additional metadata which gets forwarded to the renderer once the element
	 * gets rendered.
	 *
	 * @param element The tree element.
	 */
	filter(element: T, parentVisibility: TreeVisibility): TreeFilterResult<TFilterData>;
}

export interface ITreeSorter<T> {
	compare(element: T, otherElement: T): number;
}

export interface ITreeElement<T> {
	readonly element: T;
	readonly children?: Iterator<ITreeElement<T>> | ITreeElement<T>[];
	readonly collapsible?: boolean;
	readonly collapsed?: boolean;
}

export interface ITreeNode<T, TFilterData = void> {
	readonly element: T;
	readonly parent: ITreeNode<T, TFilterData> | undefined;
	readonly children: ITreeNode<T, TFilterData>[];
	readonly depth: number;
	readonly collapsible: boolean;
	readonly collapsed: boolean;
	readonly visible: boolean;
	readonly filterData: TFilterData | undefined;
}

export interface ICollapseStateChangeEvent<T, TFilterData> {
	node: ITreeNode<T, TFilterData>;
	deep: boolean;
}

export interface ITreeModel<T, TFilterData, TRef> {
	readonly rootRef: TRef;
	readonly onDidChangeCollapseState: Event<ICollapseStateChangeEvent<T, TFilterData>>;
	readonly onDidChangeRenderNodeCount: Event<ITreeNode<T, TFilterData>>;

	getListIndex(location: TRef): number;
	getNode(location?: TRef): ITreeNode<T, any>;
	getNodeLocation(node: ITreeNode<T, any>): TRef;
	getParentNodeLocation(location: TRef): TRef;

	getParentElement(location: TRef): T;
	getFirstElementChild(location: TRef): T | undefined;
	getLastElementAncestor(location?: TRef): T | undefined;

	isCollapsible(location: TRef): boolean;
	isCollapsed(location: TRef): boolean;
	setCollapsed(location: TRef, collapsed?: boolean, recursive?: boolean): boolean;

	refilter(): void;
}

export interface ITreeRenderer<T, TFilterData = void, TTemplateData = void> extends IListRenderer<ITreeNode<T, TFilterData>, TTemplateData> {
	renderTwistie?(element: T, twistieElement: HTMLElement): void;
	onDidChangeTwistieState?: Event<T>;
}

export interface ITreeEvent<T> {
	elements: T[];
	browserEvent?: UIEvent;
}

export interface ITreeMouseEvent<T> {
	browserEvent: MouseEvent;
	element: T | null;
}

export interface ITreeContextMenuEvent<T> {
	browserEvent: UIEvent;
	element: T | null;
	anchor: HTMLElement | { x: number; y: number; } | undefined;
}

export interface ITreeNavigator<T> {
	current(): T | null;
	previous(): T | null;
	parent(): T | null;
	first(): T | null;
	last(): T | null;
	next(): T | null;
}

/**
 * Use this renderer when you want to re-render elements on account of
 * an event firing.
 */
export abstract class AbstractTreeRenderer<T, TFilterData = void, TTemplateData = void>
	extends AbstractListRenderer<ITreeNode<T, TFilterData>, TTemplateData>
	implements ITreeRenderer<T, TFilterData, TTemplateData> {

	private elementsToNodes = new Map<T, ITreeNode<T, TFilterData>>();

	constructor(onDidChange: Event<T | T[] | undefined>) {
		super(Event.map(onDidChange, e => {
			if (typeof e === 'undefined') {
				return undefined;
			} else if (Array.isArray(e)) {
				return e.map(e => this.elementsToNodes.get(e) || null).filter(e => e !== null);
			} else {
				return this.elementsToNodes.get(e) || null;
			}
		}));
	}

	renderElement(node: ITreeNode<T, TFilterData>, index: number, templateData: TTemplateData): void {
		super.renderElement(node, index, templateData);
		this.elementsToNodes.set(node.element, node);
	}

	disposeElement(node: ITreeNode<T, TFilterData>, index: number, templateData: TTemplateData): void {
		this.elementsToNodes.set(node.element, node);
		super.disposeElement(node, index, templateData);
	}
}