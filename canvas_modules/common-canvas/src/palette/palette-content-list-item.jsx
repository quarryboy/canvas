/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2016. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/

import CanvasController from "../common-canvas-controller.js";
import React from "react";
import PropTypes from "prop-types";
import { DND_DATA_TEXT, TIP_TYPE_PALETTE_ITEM } from "../../constants/common-constants.js";

class PaletteContentListItem extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
		};

		this.onDragStart = this.onDragStart.bind(this);
		this.onDoubleClick = this.onDoubleClick.bind(this);
		this.onMouseOver = this.onMouseOver.bind(this);
		this.onMouseOut = this.onMouseOut.bind(this);
	}

	onDragStart(ev) {
		ev.dataTransfer.setData(DND_DATA_TEXT,
			JSON.stringify({
				operation: "createFromTemplate",
				operator_id_ref: this.props.nodeTemplate.operator_id_ref,
				label: this.props.nodeTemplate.label
			}));
	}

	onDoubleClick() {
		if (CanvasController.createAutoNode) {
			CanvasController.createAutoNode(this.props.nodeTemplate);
		}
	}

	onMouseOver(ev) {
		CanvasController.showTip({
			id: "paletteTip_" + this.props.nodeTemplate.operator_id_ref,
			type: TIP_TYPE_PALETTE_ITEM,
			targetObj: ev.currentTarget,
			paletteItem: this.props.nodeTemplate
		});
	}

	onMouseOut() {
		CanvasController.hideTip();
	}

	imageDrag() {
		return false;
	}

	render() {
		return (
			<div id={this.props.nodeTemplate.id}
				draggable="true"
				onDragStart={this.onDragStart}
				onDoubleClick={this.onDoubleClick}
				className="palette-list-item"
				onMouseOver={this.onMouseOver}
				onMouseOut={this.onMouseOut}
			>
				<div className="palette-list-item-icon">
					<img src={this.props.nodeTemplate.image} draggable="false" />
				</div>
				<div className="palette-list-item-text-div">
					<span className="palette-list-item-text-span">
						{this.props.nodeTemplate.label}
					</span>
				</div>
			</div>
		);
	}
}

PaletteContentListItem.propTypes = {
	nodeTemplate: PropTypes.object.isRequired
};

export default PaletteContentListItem;
