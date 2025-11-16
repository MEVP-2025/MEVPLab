import { phylotree } from "phylotree";
import { Component } from "react";
import { ExportService } from "./services/ExportService.js";
import { TreeUtils } from "./utils/TreeUtils.js";

import ControlButtons from "./components/controls/ControlButtons.jsx";
import ExportControls from "./components/controls/ExportControls.jsx";
import SizeControls from "./components/controls/SizeControls.jsx";
import Phylotree from "./components/core/phylotree.jsx";
import ContextMenu from "./components/ui/ContextMenu.jsx";

import "./styles/phylotree.css";
import { MoveToRootUtils } from "./utils/MoveToRootUtils.js";

class PhylotreeApplication extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tree: null,
      alignTips: "left",
      sort: null,
      internal: false,
      clickedBranch: null,
      newick: props.initialNewick || "",
      width: 500, // 默認寬度
      height: 500, // 默認高度
      collapsedNodes: new Set(), // 折疊節點集合
      renamedNodes: new Map(),
      merged: {},
      // ContextMenu 狀態
      contextMenu: {
        visible: false,
        position: { x: 0, y: 0 },
        nodeId: null,
        nodeData: null,
      },
      treeInstance: null,
      currentThreshold: null,
      searchTerm: "",           // 搜尋關鍵字
      highlightedNodes: new Set(), // 高亮節點ID集合
      searchResults: [],        // 搜尋結果陣列
      currentSearchIndex: -1,   // 當前選中的搜尋結果索引
    };

    // 綁定方法
    this.handleContextMenuEvent = this.handleContextMenuEvent.bind(this);
    this.closeContextMenu = this.closeContextMenu.bind(this);
    this.handleCollapseSubtree = this.handleCollapseSubtree.bind(this);
    this.handleMoveToRoot = this.handleMoveToRoot.bind(this);
    this.exportModifiedNewick = this.exportModifiedNewick.bind(this);
    this.handleNodeRename = this.handleNodeRename.bind(this);
  }

  componentDidUpdate(prevProps) {
    // 當 props 中的 initialNewick 發生變化且不為空時，更新樹
    if (
      this.props.initialNewick !== prevProps.initialNewick &&
      this.props.initialNewick
    ) {
      this.setState({
        newick: this.props.initialNewick,
        tree: null, // 重置樹實例
        treeInstance: null,
        alignTips: "left",
        sort: null,
        internal: false,
        clickedBranch: null,
        collapsedNodes: new Set(),
        renamedNodes: new Map(),
        merged: {},
        currentThreshold: null,
        contextMenu: {
          visible: false,
          position: { x: 0, y: 0 },
          nodeId: null,
          nodeData: null,
        },
      });
    }
  }

  componentDidMount() {
    
  }

  // 處理尺寸變化
  handleDimensionsChange = ({ width, height }) => {
    this.setState({ width, height });
  };

  // 調整樹寬樹高
  toggleDimension(dimension, direction) {
    const new_dimension =
        this.state[dimension] + (direction === "expand" ? 40 : -40), //增長或縮短
      new_state = {};
    new_state[dimension] = new_dimension;
    this.setState(new_state);
  }

  // 處理排序
  handleSort(direction) {
    this.setState({ sort: direction });
  }

  // 處理節點對齊
  alignTips(direction) {
    this.setState({ alignTips: direction });
  }

  // 處理 ContextMenu 事件
  handleContextMenuEvent(event) {
    this.setState({
      contextMenu: event,
    });
  }

  // 關閉 ContextMenu
  closeContextMenu() {
    this.setState({
      contextMenu: {
        ...this.state.contextMenu,
        visible: false,
      },
    });
  }

  handleExpandHorizontal = () => this.toggleDimension('width', 'expand');
  handleCompressHorizontal = () => this.toggleDimension('width', 'compress');
  handleExpandVertical = () => this.toggleDimension('height', 'expand');
  handleCompressVertical = () => this.toggleDimension('height', 'compress');
  
  handleSortAscending = () => this.handleSort('ascending');
  handleSortDescending = () => this.handleSort('descending');
  handleAlignTipsLeft = () => this.alignTips('left');
  handleAlignTipsRight = () => this.alignTips('right');

  handleWidthChange = (newWidth) => {
    this.setState({ width: newWidth });
  };

  handleHeightChange = (newHeight) => {
    this.setState({ height: newHeight });
  };

  // 處理移動到根節點的功能
  handleMoveToRoot = () => {
    const { nodeId } = this.state.contextMenu;
    const { treeInstance, newick } = this.state;

    try {
      // 使用 SubtreeUtils.moveToRoot 執行移動操作
      const result = MoveToRootUtils.moveToRoot(treeInstance, newick, nodeId);
      
      if (result.success) {
        console.log("移動操作成功");
        console.log("要移動的子樹 Newick:", result.subtreeNewick);
        console.log("移除子樹後的 Newick:", result.modifiedNewick);
        console.log("最終的 Newick:", result.newNewick);

        // 更新狀態
        this.setState({
          newick: result.newNewick,
          tree: null,
          treeInstance: null,
          // 重置相關狀態
          collapsedNodes: new Set(),
          renamedNodes: new Map(),
          merged: {},
        });

        // 顯示成功訊息（可選）
        console.log(`✅ ${result.message}`);
      } else {
        console.error("❌ 移動操作失敗:", result.error);
        alert(`移動子樹失敗: ${result.message}`);
      }

    } catch (error) {
      console.error("❌ 移動到根節點時出錯:", error);
      alert("移動子樹時發生未預期的錯誤，請檢查控制台以獲取詳細信息");
    }

    this.closeContextMenu();
  };

  // 處理重新命名後的邏輯（更新merged、重新渲染樹）
  handleNodeRename = (nodeId, newName) => {
    console.log(`PhylotreeApplication: 重命名節點 ${nodeId} 為 ${newName}`);

    // 檢查節點是否已折疊且尚未存入merged
    const isCollapsed = this.state.collapsedNodes.has(nodeId);
    // const isInMerged = this.state.merged.hasOwnProperty(nodeId);

    // 檢查是否為空字串
    if (newName.trim() === "") {
      this.setState(
        (prevState) => {
          const renamedNodes = new Map(prevState.renamedNodes);
          renamedNodes.delete(nodeId);
          return { renamedNodes };
        },
        () => {
          // 處理折疊節點的重命名
          if (this.state.collapsedNodes.has(nodeId)) {
            this.updateTree();
          }
        }
      );
    } else {
      if (isCollapsed && this.state.treeInstance) {
      // if (isCollapsed && !isInMerged && this.state.treeInstance) {
        // 找到對應的點
        const findNode = (id, node) => {
          if (!node) return null;
          if (node.unique_id === id) return node;
          if (node.children) {
            for (const child of node.children) {
              const found = findNode(id, child);
              if (found) return found;
            }
          }
          return null;
        };

        const node = findNode(nodeId, this.state.treeInstance.nodes);

        if (node) {
          const siblings = node.parent.children;

          const childrenIds = new Set();
          const collectChildrenIds = (childNode) => {
            if (!childNode) return;

            if (childNode.unique_id && childNode !== node) {
              childrenIds.add(childNode.unique_id);
            }

            if (childNode.children) {
              childNode.children.forEach(collectChildrenIds);
            }
          };

          // 收集子節點ID
          if (node.children) {
            node.children.forEach(collectChildrenIds);
          }

          const getSubtreeNewick = (subNode) => {
            return TreeUtils.convertToNewick(subNode, new Set(), new Map());
          };

          let nodeIndex = -1;
          for (let i = 0; i < siblings.length; i++) {
            if (siblings[i].unique_id === node.unique_id) {
              nodeIndex = i;
              break;
            }
          }

          this.setState(
            (prevState) => {
              const merged = { ...prevState.merged };
              merged[nodeId] = {
                children: childrenIds,
                subtreeNewick: getSubtreeNewick(node),
                rename: newName,
                parent: node.parent.unique_id,
                siblingIndex: nodeIndex,
              };
              console.log(merged);

              const renamedNodes = new Map(prevState.renamedNodes);
              renamedNodes.set(nodeId, newName);

              return { merged, renamedNodes };
            },
            () => {
              this.updateTree();
            }
          );

          return;
        }
      }
    }
  };

  updateTree = () => {
    const { treeInstance, collapsedNodes, renamedNodes } = this.state;

    if (!treeInstance) {
      console.log("樹實例尚未準備好");
      return;
    }

    try {
      // 轉換成 Newick 格式
      const updatedNewick = TreeUtils.convertToNewick(
        treeInstance.nodes,
        collapsedNodes,
        renamedNodes
      );
      console.log("更新後的 Newick:", updatedNewick);

      this.setState({ newick: updatedNewick });
    } catch (error) {
      console.error("更新樹時出錯:", error);
    }
  };

  // 處理折疊子樹選單項
  handleCollapseSubtree() {
    //single merge
    const { nodeId, isNodeCollapsed } = this.state.contextMenu;

    if (nodeId) {
      if (isNodeCollapsed) {
        // 展開節點 (Unmerge)
        this.setState((prevState) => {
          const collapsedNodes = new Set(prevState.collapsedNodes);
          collapsedNodes.delete(nodeId);

          if (
            // prevState.merged.hasOwnProperty(nodeId) &&
            prevState.treeInstance && prevState.merged[nodeId]
          ) {
            const subtreeNewick = prevState.merged[nodeId].subtreeNewick;

            try {
              const updatedNewick = this.replaceNodeWithSubtree(
                prevState.treeInstance,
                nodeId,
                subtreeNewick
              );

              if (updatedNewick) {
                const newMerged = { ...prevState.merged };
                delete newMerged[nodeId];

                return {
                  newick: updatedNewick,
                  collapsedNodes: collapsedNodes,
                  merged: newMerged,
                  // 強制重新渲染
                  tree: null,
                  treeInstance: null,
                };
              }
            } catch (error) {
              console.error("展開節點錯誤:", error);
            }
          }

          return { collapsedNodes };
        });
      } else {
        // 折疊節點 (Merge)
        this.setState((prevState) => {
          const collapsedNodes = new Set(prevState.collapsedNodes);
          collapsedNodes.add(nodeId);

          return { collapsedNodes };
        });
      }
    }

    this.closeContextMenu();
  }

  replaceNodeWithSubtree(tree, leafNodeId, newNewick) {
    console.log("開始替換節點，ID:", leafNodeId, "新Newick:", newNewick);
    // 找到要替換的葉節點
    let targetNode = null;
    tree.traverse_and_compute((node) => {
      if (node.unique_id === leafNodeId) {
        targetNode = node;
        console.log("找到目標節點:", targetNode);
        return false;
      }
      return true;
    });

    if (!targetNode) {
      console.error("找不到目標節點");
      return null;
    }

    // 解析新的 Newick 字串成樹結構
    const subtree = new phylotree(newNewick);

    // 找到要替換的節點在父節點的子節點列表中的位置
    const parentNode = targetNode.parent;
    if (!parentNode) {
      console.error("目標節點沒有父節點，無法替換");
      return null;
    }

    const indexInParent = parentNode.children.findIndex(
      (child) => child.unique_id === targetNode.unique_id
    );

    if (indexInParent === -1) {
      console.error("無法在父節點的子節點列表中找到目標節點");
      return null;
    }

    // 替換父節點的子節點列表中的目標節點
    const subtreeRoot = subtree.nodes;
    subtreeRoot.parent = parentNode;
    subtreeRoot.data.attribute = targetNode.data.attribute;
    parentNode.children[indexInParent] = subtreeRoot;

    // 轉換回完整的 Newick 字串
    const updatedNewick = TreeUtils.convertToNewick(
      tree.nodes,
      new Set(),
      new Map()
    );

    console.log("updateNewick: ", updatedNewick);

    return updatedNewick;
  }

  handleTreeReady = (tree) => {
    this.setState({ treeInstance: tree });
  };

  handleThresholdCollapse = (threshold) => {
    //group merge
    const { treeInstance, collapsedNodes } = this.state;
    if (!treeInstance) {
      console.log("樹實例尚未準備好");
      return;
    }

    // 使用現有的樹實例
    console.log("閾值:", threshold);

    // 獲取所有需要折疊的節點 ID
    const nodesToCollapse = new Set(collapsedNodes);

    // 自定義遍歷函數
    const traverseNodes = (node, hasParentCollapsed = false) => {
      if (!node) return;

      // 如果父節點已經被折疊，則跳過這個節點的檢查
      let shouldCollapseThisNode = false;

      // 只檢查尚未被父節點折疊的節點
      if (!hasParentCollapsed) {
        // 非葉節點且分支長度大於等於閾值
        if (node.children && node.children.length > 0) {
          if (node.data.abstract_x >= threshold) {
            console.log(
              "折疊節點:",
              node.unique_id,
              "分支長度:",
              node.data.abstract_x
            );
            nodesToCollapse.add(node.unique_id);
            shouldCollapseThisNode = true;
          }
        }
      }

      // 遍歷子節點，如果當前節點被折疊，則傳遞 true 給子節點
      if (node.children) {
        node.children.forEach((child) =>
          traverseNodes(child, hasParentCollapsed || shouldCollapseThisNode)
        );
      }
    };

    // 從根節點開始遍歷
    if (treeInstance.nodes) {
      traverseNodes(treeInstance.nodes);
    }

    // 更新折疊節點集合
    this.setState({ collapsedNodes: nodesToCollapse });
  };

  exportModifiedNewick = async () => {
    const { treeInstance, collapsedNodes, renamedNodes } = this.state;
    
    try {
      await ExportService.exportNewick({
        treeInstance,
        collapsedNodes,
        renamedNodes,
        filename: "exported_tree.nwk"
      });
      console.log("✅ Newick 匯出成功");
    } catch (error) {
      alert(`匯出失敗: ${error.message}`);
    }
  };

  exportTreeAsImage = async () => {
    try {
      await ExportService.exportImage({
        svgSelector: ".tree_container svg",
        filename: "phylotree.png",
        scaleFactor: 5
      });
      console.log("✅ 圖片匯出成功");
    } catch (error) {
      alert(`圖片匯出失敗: ${error.message}`);
    }
  };

  // 執行搜尋的主要方法
  handleSearch = (searchTerm) => {
    const { treeInstance } = this.state;
    
    if (!treeInstance || !searchTerm.trim()) {
      // 清空搜尋結果
      this.setState({
        searchTerm: "",
        highlightedNodes: new Set(),
        searchResults: [],
        currentSearchIndex: -1
      });
      return;
    }

    const matchedNodes = this.searchInTree(treeInstance, searchTerm);
    
    this.setState({
      searchTerm: searchTerm,
      highlightedNodes: new Set(matchedNodes.map(node => node.id)),
      searchResults: matchedNodes,
      currentSearchIndex: matchedNodes.length > 0 ? 0 : -1
    });
  };

  // 在樹中搜尋節點
  searchInTree = (tree, searchTerm) => {
    const results = [];
    const searchLower = searchTerm.toLowerCase();
    
    tree.traverse_and_compute((node) => {
      if (node.data.name && 
          node.data.name.toLowerCase().includes(searchLower)) {
        results.push({
          id: node.unique_id,
          name: node.data.name,
          node: node
        });
      }
      return true;
    });
    
    return results;
  };




  _renderControls() {
    const { width, height } = this.state;

    return (
      <div className="phylotree-application">
        <div className="button-group-container">
          <ControlButtons {...this._getControlButtonProps()} />
          <input
            type="checkbox"
            checked={this.state.internal}
            onChange={() =>
              this.setState({ internal: !this.state.internal })
            }
            style={{
              margin: "0px 3px 0px 10px",
            }}
          />
          {this.state.internal ? "Hide" : "Show"} internal labels
          <div className="size-control-and-export">
            <SizeControls
              width={width}
              height={height}
              onWidthChange={this.handleWidthChange}
              onHeightChange={this.handleHeightChange}
            />
            <ExportControls
              onExportNewick={this.exportModifiedNewick}
              onExportImage={this.exportTreeAsImage}
            />
          </div>
        </div>
        <div className="search-container">
          <input 
            name="sequenceName"
            placeholder="Species name..."
            value={this.state.searchTerm}
            onChange={(e) => this.handleSearch(e.target.value)}
          />
          <button onClick={() => this.handleSearch("")}>
            Clear
          </button>
          {this.state.searchResults.length > 0 && (
            <span className="search-results-count">
              {this.state.searchResults.length} result{this.state.searchResults.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>
    )
  }

  _getControlButtonProps() {
    return {
      onExpandHorizontal: this.handleExpandHorizontal,
      onCompressHorizontal: this.handleCompressHorizontal,
      onExpandVertical: this.handleExpandVertical,
      onCompressVertical: this.handleCompressVertical,
      onSortAscending: this.handleSortAscending,
      onSortDescending: this.handleSortDescending,
      onAlignTipsLeft: this.handleAlignTipsLeft,
      onAlignTipsRight: this.handleAlignTipsRight,
    };
  }

  _renderTreeContainer() {
    const { padding } = this.props;
    const { width, height, contextMenu } = this.state;
    const svgWidth = width + padding * 4; // 增加左右邊距
    const svgHeight = height + padding * 4; // 增加上下邊距

    return (
      <div className="tree_container" style={{ position: "relative" }}>
        <ContextMenu
          visible={contextMenu.visible}
          position={contextMenu.position}
          onClose={this.closeContextMenu}
          onCollapseSubtree={this.handleCollapseSubtree}
          onMoveToRoot={this.handleMoveToRoot}
          isNodeCollapsed={contextMenu.isNodeCollapsed}
        />

        <svg width={svgWidth + 150} height={svgHeight}>
          <Phylotree {...this._getPhylotreeProps()} />
        </svg>
      </div>
    )
  }

  _getPhylotreeProps() {
    const { padding } = this.props;
    const { width, height } = this.state;
    
    return {
      width,
      height,
      transform: `translate(${padding * 2}, ${padding * 2})`,
      newick: this.state.newick,
      onDimensionsChange: this.handleDimensionsChange,
      alignTips: this.state.alignTips,
      sort: this.state.sort,
      internalNodeLabels: this.state.internal,
      onBranchClick: this._handleBranchClick,
      includeBLAxis: true,
      collapsedNodes: this.state.collapsedNodes,
      renamedNodes: this.state.renamedNodes,
      merged: this.state.merged,
      onContextMenuEvent: this.handleContextMenuEvent,
      onTreeReady: this.handleTreeReady,
      onThresholdCollapse: this.handleThresholdCollapse,
      onNodeRename: this.handleNodeRename,
      highlightedNodes: this.state.highlightedNodes,
      searchTerm: this.state.searchTerm,
    };
  }

  _handleBranchClick = (branch) => {
    this.setState({ clickedBranch: branch.target.data.name });
  };

  render() {
    const { clickedBranch } = this.state;

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {this._renderControls()}
        </div>

        {this._renderTreeContainer()}

        {clickedBranch ? <p>Last clicked branch was {clickedBranch}.</p> : null}
      </div>
    );
  }
}

PhylotreeApplication.defaultProps = {
  padding: 10,
};

export default PhylotreeApplication;