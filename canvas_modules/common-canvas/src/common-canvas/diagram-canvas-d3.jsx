/*
 * Copyright 2017-2020 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint no-shadow: ["error", { "allow": ["Node", "Comment"] }] */

import React from "react";
import PropTypes from "prop-types";
import ReactResizeDetector from "react-resize-detector";
import BlankCanvasImage from "../../assets/images/blank_canvas.svg";

import {
	DND_DATA_TEXT
} from "./constants/canvas-constants";

import Logger from "../logging/canvas-logger.js";
import SVGCanvasD3 from "./svg-canvas-d3.js";

export default class DiagramCanvas extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			isDropZoneDisplayed: false
		};

		this.logger = new Logger("DiagramCanvas");

		this.svgCanvasDivId = "d3-svg-canvas-div-" + this.props.canvasController.getInstanceId();
		this.svgCanvasDivSelector = "#" + this.svgCanvasDivId;

		this.drop = this.drop.bind(this);
		this.focusOnCanvas = this.focusOnCanvas.bind(this);
		this.setIsDropZoneDisplayed = this.setIsDropZoneDisplayed.bind(this);
		this.dragOver = this.dragOver.bind(this);
		this.dragEnter = this.dragEnter.bind(this);
		this.dragLeave = this.dragLeave.bind(this);
		this.refreshOnSizeChange = this.refreshOnSizeChange.bind(this);

		this.onCut = this.onCut.bind(this);
		this.onCopy = this.onCopy.bind(this);
		this.onPaste = this.onPaste.bind(this);

		// Variables to handle strange HTML drag and drop behaviors. That is, pairs
		// of dragEnter/dragLeave events are fired as an external object is
		// dragged around over the top of the 'drop zone' canvas.
		this.first = false;
		this.second = false;

		this.canvasDivId = "canvas-div-" + this.props.canvasController.getInstanceId();
	}

	componentDidMount() {
		this.canvasD3Layout =
			new SVGCanvasD3(this.props.canvasInfo,
				this.svgCanvasDivSelector,
				this.props.config,
				this.props.canvasController);
		document.addEventListener("cut", this.onCut, true);
		document.addEventListener("copy", this.onCopy, true);
		document.addEventListener("paste", this.onPaste, true);
		this.focusOnCanvas();
	}

	componentDidUpdate() {
		if (this.canvasD3Layout && !this.isDropZoneDisplayed()) {
			this.canvasD3Layout.setCanvasInfo(this.props.canvasInfo, this.props.config);
		}
	}

	componentWillUnmount() {
		document.removeEventListener("cut", this.onCut, true);
		document.removeEventListener("copy", this.onCopy, true);
		document.removeEventListener("paste", this.onPaste, true);
	}

	onCut(evt) {
		if (evt.currentTarget.activeElement.id === this.svgCanvasDivId) {
			evt.preventDefault();
			this.props.canvasController.cutToClipboard();
		}
	}

	onCopy(evt) {
		if (evt.currentTarget.activeElement.id === this.svgCanvasDivId) {
			evt.preventDefault();
			this.props.canvasController.copyToClipboard();
		}
	}

	onPaste(evt) {
		if (evt.currentTarget.activeElement.id === this.svgCanvasDivId) {
			evt.preventDefault();
			this.props.canvasController.pasteFromClipboard();
		}
	}

	getDNDJson(event) {
		try {
			return JSON.parse(event.dataTransfer.getData(DND_DATA_TEXT));
		} catch (e) {
			this.logger.warn("The dragged object's data does not conform to the expected internal format: " + e);
			return null;
		}
	}

	getSvgViewportOffset() {
		return this.canvasD3Layout.getSvgViewportOffset();
	}

	getZoomToReveal(objectIds, xPos, yPos) {
		return this.canvasD3Layout.getZoomToReveal(objectIds, xPos, yPos);
	}

	getZoom() {
		return this.canvasD3Layout.getZoom();
	}

	setIsDropZoneDisplayed(isDropZoneDisplayed) {
		if (isDropZoneDisplayed !== this.state.isDropZoneDisplayed) {
			this.setState({ isDropZoneDisplayed: isDropZoneDisplayed });
		}
	}

	isDropZoneDisplayed() {
		return this.props.config.enableDropZoneOnExternalDrag && this.state.isDropZoneDisplayed;
	}

	isDataTypeBeingDraggedFile(event) {
		if (event.dataTransfer && Array.isArray(event.dataTransfer.types)) {
			return event.dataTransfer.types.includes("Files");
		}
		return false;
	}

	zoomTo(zoomObject) {
		this.canvasD3Layout.zoomTo(zoomObject);
	}

	translateBy(x, y, animateTime) {
		this.canvasD3Layout.translateBy(x, y, animateTime);
	}

	mouseCoords(event) {
		const rect = event.currentTarget.getBoundingClientRect();

		return {
			x: event.clientX - Math.round(rect.left),
			y: event.clientY - Math.round(rect.top)
		};
	}

	drop(event) {
		event.preventDefault();
		this.first = false;
		this.second = false;
		this.setIsDropZoneDisplayed(false);
		const mousePos = this.mouseCoords(event);

		const nodeTemplate = event.canvasNodeTemplate;
		if (nodeTemplate) {
			this.canvasD3Layout.nodeTemplateDropped(nodeTemplate, mousePos);

		} else {
			let dropData = this.getDNDJson(event);
			// If no drop data is found (which complies with the calling protocol
			// described in the wiki) we just pass through the dataTransfer data and
			// set an appropriate operation.
			if (!dropData) {
				dropData = {
					operation: "addToCanvas",
					data: {
						dataTransfer: event.dataTransfer,
						editType: "createFromExternalObject"
					}
				};
			}
			this.canvasD3Layout.externalObjectDropped(dropData, mousePos);
		}

		// canvasNodeTemplate will persist in future events if we don't remove it
		delete event.canvasNodeTemplate;
		// Also clear dataTransfer data for when we get external objects.
		event.dataTransfer.clearData();
	}

	dragOver(event) {
		const nodeTemplate = event.canvasNodeTemplate;
		if (nodeTemplate) {
			this.canvasD3Layout.paletteNodeDraggedOver(nodeTemplate, event.clientX, event.clientY);
		}
	}

	dragEnter(event) {
		if (this.isDataTypeBeingDraggedFile(event)) {
			if (this.first) {
				this.second = true;
			} else {
				this.first = true;
				this.setIsDropZoneDisplayed(true);
			}
		}
		event.preventDefault();
	}

	dragLeave(event) {
		if (this.isDataTypeBeingDraggedFile(event)) {
			if (this.second) {
				this.second = false;
			} else if (this.first) {
				this.first = false;
			}

			if (!this.first && !this.second) {
				this.setIsDropZoneDisplayed(false);
			}
		}
		event.preventDefault();
	}

	focusOnCanvas() {
		if (document.getElementById(this.svgCanvasDivId)) {
			document.getElementById(this.svgCanvasDivId).focus(); // Set focus on div so keybord events go there.
		}
	}

	zoomIn() {
		this.canvasD3Layout.zoomIn();
	}

	zoomOut() {
		this.canvasD3Layout.zoomOut();
	}

	zoomToFit() {
		this.canvasD3Layout.zoomToFit();
	}

	// Re-renders the diagram canvas when the canvas size changes. This refresh
	// is needed because the output binding ports of sub-flows displayed full-page
	// need to be rerendered as the canvas size changes. The canvas size might
	// change when the right side panel is opened or the browser is resized.
	refreshOnSizeChange() {
		if (this.canvasD3Layout) {
			this.canvasD3Layout.refreshOnSizeChange();
		}
	}

	render() {
		let emptyCanvas = null;

		if (this.props.isCanvasEmpty) {
			if (this.props.config.emptyCanvasContent) {
				emptyCanvas = (
					<div className="empty-canvas">
						{this.props.config.emptyCanvasContent}
					</div>);
			} else {
				emptyCanvas = (
					<div className="empty-canvas">
						<div>
							<img src={BlankCanvasImage} className="empty-canvas-image" />
							<span className="empty-canvas-text">Your flow is empty!</span>
						</div>
					</div>);
			}
		}

		let dropZoneCanvas = null;

		if (this.isDropZoneDisplayed()) {
			if (this.props.config.dropZoneCanvasContent) {
				dropZoneCanvas = this.props.config.dropZoneCanvasContent;
			} else {
				dropZoneCanvas = (
					<div>
						<div className="dropzone-canvas" />
						<div className="dropzone-canvas-rect" />
					</div>);
			}
		}

		// Set tabindex to -1 so the focus (see componentDidMount above) can go to
		// the div (which allows keyboard events to go there) and using -1 means
		// the user cannot tab to the div. Keyboard events are handled in svg-canvas-d3.js.
		// https://stackoverflow.com/questions/32911355/whats-the-tabindex-1-in-bootstrap-for
		const svgCanvas = (<div tabIndex="-1" className="d3-svg-canvas-div" id={this.svgCanvasDivId} />);

		const dropDivClassName = this.props.config.enableToolbarLayout === "None"
			? "common-canvas-drop-div common-canvas-toolbar-none"
			: "common-canvas-drop-div";

		return (
			<ReactResizeDetector handleWidth handleHeight onResize={this.refreshOnSizeChange}>
				<div
					id={this.canvasDivId}
					className={dropDivClassName}
					onDrop={this.drop}
					onDragOver={this.dragOver}
					onDragEnter={this.dragEnter}
					onDragLeave={this.dragLeave}
				>
					{emptyCanvas}
					{svgCanvas}
					{this.props.children}
					{dropZoneCanvas}
				</div>
			</ReactResizeDetector>
		);
	}
}

DiagramCanvas.propTypes = {
	canvasInfo: PropTypes.object,
	config: PropTypes.object.isRequired,
	canvasController: PropTypes.object.isRequired,
	children: PropTypes.element,
	isCanvasEmpty: PropTypes.bool
};
