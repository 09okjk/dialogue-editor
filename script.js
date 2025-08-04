// 全局状态管理
class DialogueEditor {
    constructor() {
        this.scenes = [];
        this.currentSceneId = null;
        this.currentDialogueId = null;
        this.nextSceneId = 1;
        this.nextDialogueId = 1;
        this.nextNodeId = 1;
        this.isOnline = navigator.onLine;
        
        // 监听网络状态变化
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncWithServer();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
        
        this.initializeEventListeners();
        this.loadDataFromServer();
    }
    
    // 初始化ID计数器
    initializeIds() {
        let maxSceneId = 0;
        let maxDialogueId = 0;
        let maxNodeId = 0;
        
        this.scenes.forEach(scene => {
            if (scene.id > maxSceneId) maxSceneId = scene.id;
            scene.dialogues.forEach(dialogue => {
                if (dialogue.id > maxDialogueId) maxDialogueId = dialogue.id;
                dialogue.nodes.forEach(node => {
                    if (node.id > maxNodeId) maxNodeId = node.id;
                });
            });
        });
        
        this.nextSceneId = maxSceneId + 1;
        this.nextDialogueId = maxDialogueId + 1;
        this.nextNodeId = maxNodeId + 1;
    }
    
    // 加载数据从服务器
    async loadDataFromServer() {
        try {
            const response = await fetch('/api/data');
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.scenes = result.data || [];
                    this.initializeIds();
                    this.renderScenes();
                    console.log('数据从服务器加载成功');
                } else {
                    console.error('服务器返回错误:', result.message);
                    this.loadFromLocalStorage(); // 回退到本地存储
                }
            } else {
                console.error('无法连接到服务器，使用本地存储');
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('加载数据时出错:', error);
            this.loadFromLocalStorage();
        }
    }
    
    // 从本地存储加载数据（离线模式或服务器不可用时的回退方案）
    loadFromLocalStorage() {
        const localData = localStorage.getItem('dialogueScenes');
        if (localData) {
            this.scenes = JSON.parse(localData);
        } else {
            this.scenes = [];
        }
        this.initializeIds();
        this.renderScenes();
    }
    
    // 保存数据到服务器
    async saveData() {
        // 总是保存到本地存储作为备份
        localStorage.setItem('dialogueScenes', JSON.stringify(this.scenes));
        
        // 如果在线，也保存到服务器
        if (this.isOnline) {
            try {
                const response = await fetch('/api/data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ data: this.scenes })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        console.log('数据已同步到服务器');
                        this.showNotification('数据已保存并同步', 'success');
                    } else {
                        console.error('服务器保存失败:', result.message);
                        this.showNotification('数据已本地保存，但服务器同步失败', 'warning');
                    }
                } else {
                    console.error('服务器响应错误:', response.status);
                    this.showNotification('数据已本地保存，但服务器同步失败', 'warning');
                }
            } catch (error) {
                console.error('保存到服务器时出错:', error);
                this.showNotification('数据已本地保存，但服务器同步失败', 'warning');
            }
        } else {
            this.showNotification('离线模式：数据已本地保存', 'info');
        }
    }
    
    // 与服务器同步数据
    async syncWithServer() {
        if (!this.isOnline) return;
        
        try {
            // 获取服务器数据
            const response = await fetch('/api/data');
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const serverData = result.data || [];
                    const localData = JSON.parse(localStorage.getItem('dialogueScenes') || '[]');
                    
                    // 简单的同步策略：如果本地有数据且服务器为空，上传本地数据
                    // 否则使用服务器数据
                    if (localData.length > 0 && serverData.length === 0) {
                        await this.saveData(); // 上传本地数据到服务器
                    } else if (serverData.length > 0) {
                        this.scenes = serverData;
                        this.initializeIds();
                        this.renderScenes();
                        localStorage.setItem('dialogueScenes', JSON.stringify(this.scenes));
                        this.showNotification('数据已从服务器同步', 'success');
                    }
                }
            }
        } catch (error) {
            console.error('同步数据时出错:', error);
        }
    }
    
    // 初始化事件监听器
    initializeEventListeners() {
        // 新建场景
        document.getElementById('new-scene-btn').addEventListener('click', () => {
            this.showNewSceneModal();
        });
        
        // 新建对话
        document.getElementById('new-dialogue-btn').addEventListener('click', () => {
            this.createNewDialogue();
        });
        
        // 导出功能
        document.getElementById('export-single-btn').addEventListener('click', () => {
            this.exportSingleScene();
        });
        
        document.getElementById('export-all-btn').addEventListener('click', () => {
            this.exportAllScenes();
        });
        
        // 返回按钮
        document.getElementById('back-btn').addEventListener('click', () => {
            this.showMainPage();
        });
        
        // 保存对话
        document.getElementById('save-dialogue-btn').addEventListener('click', () => {
            this.saveCurrentDialogue();
        });
        
        // 添加节点
        document.getElementById('add-node-btn').addEventListener('click', () => {
            this.addNewNode();
        });
        
        // 全部展开/收起
        document.getElementById('toggle-all-nodes-btn').addEventListener('click', () => {
            this.toggleAllNodes();
        });
        
        // 模态框事件
        document.getElementById('modal-close').addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal-overlay')) {
                this.hideModal();
            }
        });
    }
    
    // 显示新建场景模态框
    showNewSceneModal() {
        const modalContent = `
            <div class="form-group">
                <label class="form-label">场景名称</label>
                <input type="text" id="scene-name-input" class="form-input" placeholder="请输入场景名称">
            </div>
        `;
        
        this.showModal('新建场景', modalContent, () => {
            const sceneName = document.getElementById('scene-name-input').value.trim();
            if (sceneName) {
                this.createNewScene(sceneName);
                this.hideModal();
            } else {
                alert('请输入场景名称');
            }
        });
        
        // 聚焦输入框
        setTimeout(() => {
            document.getElementById('scene-name-input').focus();
        }, 100);
    }
    
    // 创建新场景
    createNewScene(name) {
        const newScene = {
            id: this.nextSceneId++,
            name: name,
            dialogues: []
        };
        
        this.scenes.push(newScene);
        this.saveData();
        this.renderScenes();
    }
    
    // 渲染场景列表
    renderScenes() {
        const sceneList = document.getElementById('scene-list');
        
        if (this.scenes.length === 0) {
            sceneList.innerHTML = `
                <div class="empty-state">
                    <p>暂无场景，点击"新建场景"开始创建</p>
                </div>
            `;
            return;
        }
        
        sceneList.innerHTML = this.scenes.map(scene => `
            <div class="scene-item ${scene.id === this.currentSceneId ? 'active' : ''}" data-scene-id="${scene.id}">
                <div class="scene-name">${scene.name}</div>
                <div class="scene-actions">
                    <button class="btn btn-secondary btn-edit-scene" data-scene-id="${scene.id}">重命名</button>
                    <button class="btn btn-danger btn-delete-scene" data-scene-id="${scene.id}">删除</button>
                </div>
            </div>
        `).join('');
        
        // 添加场景点击事件
        sceneList.querySelectorAll('.scene-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn')) {
                    const sceneId = parseInt(item.dataset.sceneId);
                    this.selectScene(sceneId);
                }
            });
        });
        
        // 添加重命名事件
        sceneList.querySelectorAll('.btn-edit-scene').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sceneId = parseInt(btn.dataset.sceneId);
                this.showRenameSceneModal(sceneId);
            });
        });
        
        // 添加删除事件
        sceneList.querySelectorAll('.btn-delete-scene').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sceneId = parseInt(btn.dataset.sceneId);
                this.deleteScene(sceneId);
            });
        });
    }
    
    // 选择场景
    selectScene(sceneId) {
        this.currentSceneId = sceneId;
        const scene = this.scenes.find(s => s.id === sceneId);
        
        document.getElementById('current-scene-title').textContent = scene.name;
        document.getElementById('new-dialogue-btn').disabled = false;
        document.getElementById('export-single-btn').disabled = false;
        
        this.renderScenes();
        this.renderDialogues();
    }
    
    // 显示重命名场景模态框
    showRenameSceneModal(sceneId) {
        const scene = this.scenes.find(s => s.id === sceneId);
        const modalContent = `
            <div class="form-group">
                <label class="form-label">场景名称</label>
                <input type="text" id="rename-scene-input" class="form-input" value="${scene.name}">
            </div>
        `;
        
        this.showModal('重命名场景', modalContent, () => {
            const newName = document.getElementById('rename-scene-input').value.trim();
            if (newName) {
                scene.name = newName;
                this.saveData();
                this.renderScenes();
                if (this.currentSceneId === sceneId) {
                    document.getElementById('current-scene-title').textContent = newName;
                }
                this.hideModal();
            } else {
                alert('请输入场景名称');
            }
        });
        
        setTimeout(() => {
            const input = document.getElementById('rename-scene-input');
            input.focus();
            input.select();
        }, 100);
    }
    
    // 删除场景
    deleteScene(sceneId) {
        const scene = this.scenes.find(s => s.id === sceneId);
        if (confirm(`确定要删除场景"${scene.name}"吗？此操作不可撤销。`)) {
            this.scenes = this.scenes.filter(s => s.id !== sceneId);
            if (this.currentSceneId === sceneId) {
                this.currentSceneId = null;
                document.getElementById('current-scene-title').textContent = '请选择一个场景';
                document.getElementById('new-dialogue-btn').disabled = true;
                document.getElementById('export-single-btn').disabled = true;
                this.renderDialogues();
            }
            this.saveData();
            this.renderScenes();
        }
    }
    
    // 创建新对话
    createNewDialogue() {
        if (!this.currentSceneId) return;
        
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const newDialogue = {
            id: this.nextDialogueId++,
            nodes: [this.createDefaultNode()]
        };
        
        scene.dialogues.push(newDialogue);
        this.saveData();
        this.renderDialogues();
    }
    
    // 创建默认节点
    createDefaultNode() {
        // 获取当前对话中的最大节点ID，从1开始编号
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene?.dialogues.find(d => d.id === this.currentDialogueId);
        
        let maxNodeIdInDialogue = 0;
        if (dialogue && dialogue.nodes) {
            dialogue.nodes.forEach(node => {
                const nodeIdNum = parseInt(node.nodeID.replace('node_', ''));
                if (nodeIdNum > maxNodeIdInDialogue) {
                    maxNodeIdInDialogue = nodeIdNum;
                }
            });
        }
        
        const newNodeIdNum = maxNodeIdInDialogue + 1;
        
        return {
            id: this.nextNodeId++,
            nodeID: `node_${newNodeIdNum}`,
            text: '',
            speaker: {
                speakerID: '',
                speakerName: '',
                speakerType: 'Npc',
                emotion: 'Neutral'
            },
            nextNodeID: '',
            questID: '',
            rewardIDs: [],
            isFollow: false,
            conditionType: 'None',
            conditionValue: '',
            choices: []
        };
    }
    
    // 渲染对话列表
    renderDialogues() {
        const dialogueList = document.getElementById('dialogue-list');
        
        if (!this.currentSceneId) {
            dialogueList.innerHTML = `
                <div class="empty-state">
                    <p>请先选择一个场景查看对话</p>
                </div>
            `;
            return;
        }
        
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        
        if (scene.dialogues.length === 0) {
            dialogueList.innerHTML = `
                <div class="empty-state">
                    <p>该场景暂无对话，点击"新建对话"开始创建</p>
                </div>
            `;
            return;
        }
        
        dialogueList.innerHTML = scene.dialogues.map(dialogue => `
            <div class="dialogue-item">
                <div class="dialogue-info">
                    <div class="dialogue-id-section">
                        <span class="dialogue-id-label">对话 ID:</span>
                        <span class="dialogue-id-value" data-dialogue-id="${dialogue.id}">${dialogue.id}</span>
                        <button class="btn-edit-id" data-dialogue-id="${dialogue.id}" title="编辑ID">✏️</button>
                    </div>
                    <div class="dialogue-meta">${dialogue.nodes.length} 个节点</div>
                </div>
                <div class="dialogue-actions">
                    <button class="btn btn-primary btn-edit-dialogue" data-dialogue-id="${dialogue.id}">编辑</button>
                    <button class="btn btn-danger btn-delete-dialogue" data-dialogue-id="${dialogue.id}">删除</button>
                </div>
            </div>
        `).join('');
        
        // 添加编辑事件
        dialogueList.querySelectorAll('.btn-edit-dialogue').forEach(btn => {
            btn.addEventListener('click', () => {
                const dialogueId = parseInt(btn.dataset.dialogueId);
                this.editDialogue(dialogueId);
            });
        });
        
        // 添加删除事件
        dialogueList.querySelectorAll('.btn-delete-dialogue').forEach(btn => {
            btn.addEventListener('click', () => {
                const dialogueId = parseInt(btn.dataset.dialogueId);
                this.deleteDialogue(dialogueId);
            });
        });
        
        // 添加编辑ID事件
        dialogueList.querySelectorAll('.btn-edit-id').forEach(btn => {
            btn.addEventListener('click', () => {
                const dialogueId = parseInt(btn.dataset.dialogueId);
                this.editDialogueId(dialogueId);
            });
        });
    }
    
    // 编辑对话
    editDialogue(dialogueId) {
        this.currentDialogueId = dialogueId;
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.id === dialogueId);
        
        document.getElementById('edit-dialogue-title').textContent = `编辑对话 ID: ${dialogueId}`;
        this.showEditPage();
        this.renderNodes(dialogue.nodes);
    }
    
    // 删除对话
    deleteDialogue(dialogueId) {
        if (confirm('确定要删除这个对话吗？此操作不可撤销。')) {
            const scene = this.scenes.find(s => s.id === this.currentSceneId);
            scene.dialogues = scene.dialogues.filter(d => d.id !== dialogueId);
            this.saveData();
            this.renderDialogues();
        }
    }
    
    // 编辑对话ID
    editDialogueId(dialogueId) {
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.id === dialogueId);
        
        if (!dialogue) return;
        
        const newId = prompt('请输入新的对话ID：', dialogue.id);
        
        if (newId === null || newId.trim() === '') {
            return; // 用户取消或输入为空
        }
        
        const trimmedNewId = newId.trim();
        
        // 检查是否与其他对话ID重复
        const existingDialogue = scene.dialogues.find(d => d.id.toString() === trimmedNewId && d.id !== dialogueId);
        if (existingDialogue) {
            alert('该ID已存在，请选择其他ID。');
            return;
        }
        
        // 更新对话ID
        dialogue.id = trimmedNewId;
        this.saveData();
        this.renderDialogues();
        
        // 如果当前正在编辑这个对话，更新编辑页面标题
        if (this.currentDialogueId === dialogueId) {
            this.currentDialogueId = trimmedNewId;
            document.getElementById('edit-dialogue-title').textContent = `编辑对话 ID: ${trimmedNewId}`;
        }
    }
    
    // 显示编辑页面
    showEditPage() {
        document.getElementById('main-page').classList.remove('active');
        document.getElementById('edit-page').classList.add('active');
    }
    
    // 显示主页面
    showMainPage() {
        document.getElementById('edit-page').classList.remove('active');
        document.getElementById('main-page').classList.add('active');
    }
    
    // 渲染节点
    renderNodes(nodes) {
        const container = document.getElementById('nodes-container');
        
        // 枚举选项
        const speakerTypes = ['Player', 'Npc', 'System', 'PlayerChoice', 'NpcNotice'];
        const emotions = ['Neutral', 'NeutralCamera', 'Happy', 'HappyCamera', 'Sad', 'SadCamera', 'Angry', 'AngryCamera', 'Surprised', 'SurprisedCamera', 'Smile', 'SmileCamera', 'SmileGlasses', 'Wink', 'WinkCamera', 'Confused', 'ConfusedCamera'];
        const conditionTypes = ['None', 'QuestCompleted', 'ItemAcquired', 'SceneName', 'NpcCheck', 'DialogueCompleted', 'EnemyCleared'];
        
        container.innerHTML = nodes.map((node, index) => `
            <div class="node-item" data-node-id="${node.id}">
                <div class="node-header">
                    <div class="node-title-section">
                        <button class="btn-toggle-node" data-node-id="${node.id}">
                            <span class="toggle-icon">▼</span>
                        </button>
                        <div class="node-title">节点 ${index + 1} (ID: ${node.nodeID})</div>
                    </div>
                    <div class="node-actions">
                        <button class="btn btn-success btn-add-choice" data-node-id="${node.id}">添加选择项</button>
                        <button class="btn btn-danger btn-delete-node" data-node-id="${node.id}">删除节点</button>
                    </div>
                </div>
                <div class="node-content" data-node-id="${node.id}">
                <div class="node-fields">
                    <div class="field-group">
                        <label class="field-label">节点ID</label>
                        <input type="text" class="field-input" data-field="nodeID" data-node-id="${node.id}" value="${node.nodeID}">
                    </div>
                    <div class="field-group">
                        <label class="field-label">对话文本</label>
                        <textarea class="field-input field-textarea" data-field="text" data-node-id="${node.id}">${node.text}</textarea>
                    </div>
                    <div class="field-group">
                        <label class="field-label">说话者ID</label>
                        <input type="text" class="field-input" data-field="speaker.speakerID" data-node-id="${node.id}" value="${node.speaker.speakerID}">
                    </div>
                    <div class="field-group">
                        <label class="field-label">说话者名称</label>
                        <input type="text" class="field-input" data-field="speaker.speakerName" data-node-id="${node.id}" value="${node.speaker.speakerName}">
                    </div>
                    <div class="field-group">
                        <label class="field-label">说话者类型</label>
                        <select class="field-input" data-field="speaker.speakerType" data-node-id="${node.id}">
                            ${speakerTypes.map(type => `<option value="${type}" ${node.speaker.speakerType === type ? 'selected' : ''}>${type}</option>`).join('')}
                        </select>
                    </div>
                    <div class="field-group">
                        <label class="field-label">情绪</label>
                        <select class="field-input" data-field="speaker.emotion" data-node-id="${node.id}">
                            ${emotions.map(emotion => `<option value="${emotion}" ${node.speaker.emotion === emotion ? 'selected' : ''}>${emotion}</option>`).join('')}
                        </select>
                    </div>
                    <div class="field-group">
                        <label class="field-label">下一节点ID</label>
                        <input type="text" class="field-input" data-field="nextNodeID" data-node-id="${node.id}" value="${node.nextNodeID}">
                    </div>
                    <div class="field-group">
                        <label class="field-label">任务ID</label>
                        <input type="text" class="field-input" data-field="questID" data-node-id="${node.id}" value="${node.questID}">
                    </div>
                    <div class="field-group">
                        <label class="field-label">奖励ID列表 (用分号分隔)</label>
                        <input type="text" class="field-input" data-field="rewardIDs" data-node-id="${node.id}" value="${Array.isArray(node.rewardIDs) ? node.rewardIDs.join(';') : node.rewardIDs}">
                    </div>
                    <div class="field-group">
                        <label class="field-label">是否跟随</label>
                        <select class="field-input" data-field="isFollow" data-node-id="${node.id}">
                            <option value="false" ${!node.isFollow ? 'selected' : ''}>false</option>
                            <option value="true" ${node.isFollow ? 'selected' : ''}>true</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label class="field-label">条件类型</label>
                        <select class="field-input" data-field="conditionType" data-node-id="${node.id}">
                            ${conditionTypes.map(type => `<option value="${type}" ${node.conditionType === type ? 'selected' : ''}>${type}</option>`).join('')}
                        </select>
                    </div>
                    <div class="field-group">
                        <label class="field-label">条件值</label>
                        <input type="text" class="field-input" data-field="conditionValue" data-node-id="${node.id}" value="${node.conditionValue}">
                    </div>
                </div>
                
                <!-- 选择项部分 -->
                <div class="choices-section">
                    <h4>选择项</h4>
                    <div class="choices-container" data-node-id="${node.id}">
                        ${node.choices.map((choice, choiceIndex) => `
                            <div class="choice-item">
                                <div class="field-group">
                                    <label class="field-label">选择项文本</label>
                                    <input type="text" class="field-input choice-text" data-choice-index="${choiceIndex}" data-node-id="${node.id}" value="${choice.text}">
                                </div>
                                <div class="field-group">
                                    <label class="field-label">目标节点ID</label>
                                    <input type="text" class="field-input choice-next" data-choice-index="${choiceIndex}" data-node-id="${node.id}" value="${choice.nextNodeID}">
                                </div>
                                <button class="btn btn-danger btn-remove-choice" data-choice-index="${choiceIndex}" data-node-id="${node.id}">删除选择项</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                </div>
            </div>
        `).join('');
        
        // 添加输入事件监听
        container.querySelectorAll('.field-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const nodeId = parseInt(e.target.dataset.nodeId);
                const field = e.target.dataset.field;
                const value = e.target.value;
                this.updateNodeField(nodeId, field, value);
            });
            
            input.addEventListener('change', (e) => {
                const nodeId = parseInt(e.target.dataset.nodeId);
                const field = e.target.dataset.field;
                const value = e.target.value;
                this.updateNodeField(nodeId, field, value);
            });
        });
        
        // 添加选择项相关事件
        container.querySelectorAll('.choice-text, .choice-next').forEach(input => {
            input.addEventListener('input', (e) => {
                const nodeId = parseInt(e.target.dataset.nodeId);
                const choiceIndex = parseInt(e.target.dataset.choiceIndex);
                const isText = e.target.classList.contains('choice-text');
                const value = e.target.value;
                this.updateChoice(nodeId, choiceIndex, isText ? 'text' : 'nextNodeID', value);
            });
        });
        
        // 添加选择项按钮事件
        container.querySelectorAll('.btn-add-choice').forEach(btn => {
            btn.addEventListener('click', () => {
                const nodeId = parseInt(btn.dataset.nodeId);
                this.addChoice(nodeId);
            });
        });
        
        container.querySelectorAll('.btn-remove-choice').forEach(btn => {
            btn.addEventListener('click', () => {
                const nodeId = parseInt(btn.dataset.nodeId);
                const choiceIndex = parseInt(btn.dataset.choiceIndex);
                this.removeChoice(nodeId, choiceIndex);
            });
        });
        
        // 添加删除节点事件
        container.querySelectorAll('.btn-delete-node').forEach(btn => {
            btn.addEventListener('click', () => {
                const nodeId = parseInt(btn.dataset.nodeId);
                this.deleteNode(nodeId);
            });
        });
        
        // 添加节点折叠事件
        container.querySelectorAll('.btn-toggle-node').forEach(btn => {
            btn.addEventListener('click', () => {
                const nodeId = parseInt(btn.dataset.nodeId);
                this.toggleNode(nodeId);
            });
        });
    }
    
    // 更新节点字段
    updateNodeField(nodeId, field, value) {
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.id === this.currentDialogueId);
        const node = dialogue.nodes.find(n => n.id === nodeId);
        
        if (node) {
            // 处理嵌套字段（如 speaker.speakerID）
            if (field.includes('.')) {
                const [parentField, childField] = field.split('.');
                if (!node[parentField]) {
                    node[parentField] = {};
                }
                node[parentField][childField] = value;
            } else {
                // 处理特殊字段
                if (field === 'rewardIDs') {
                    node[field] = value ? value.split(';').map(id => id.trim()).filter(id => id) : [];
                } else if (field === 'isFollow') {
                    node[field] = value === 'true';
                } else {
                    node[field] = value;
                }
            }
        }
    }
    
    // 添加选择项
    addChoice(nodeId) {
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.id === this.currentDialogueId);
        const node = dialogue.nodes.find(n => n.id === nodeId);
        
        if (node) {
            node.choices.push({
                text: '',
                nextNodeID: ''
            });
            this.renderNodes(dialogue.nodes);
        }
    }
    
    // 更新选择项
    updateChoice(nodeId, choiceIndex, field, value) {
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.id === this.currentDialogueId);
        const node = dialogue.nodes.find(n => n.id === nodeId);
        
        if (node && node.choices[choiceIndex]) {
            node.choices[choiceIndex][field] = value;
        }
    }
    
    // 删除选择项
    removeChoice(nodeId, choiceIndex) {
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.id === this.currentDialogueId);
        const node = dialogue.nodes.find(n => n.id === nodeId);
        
        if (node && node.choices[choiceIndex]) {
            node.choices.splice(choiceIndex, 1);
            this.renderNodes(dialogue.nodes);
        }
    }
    
    // 切换节点展开/收起状态
    toggleNode(nodeId) {
        const nodeContent = document.querySelector(`.node-content[data-node-id="${nodeId}"]`);
        const toggleIcon = document.querySelector(`.btn-toggle-node[data-node-id="${nodeId}"] .toggle-icon`);
        
        if (nodeContent && toggleIcon) {
            const isCollapsed = nodeContent.style.display === 'none';
            
            if (isCollapsed) {
                // 展开
                nodeContent.style.display = 'block';
                toggleIcon.textContent = '▼';
                nodeContent.closest('.node-item').classList.remove('collapsed');
            } else {
                // 收起
                nodeContent.style.display = 'none';
                toggleIcon.textContent = '▶';
                nodeContent.closest('.node-item').classList.add('collapsed');
            }
        }
    }
    
    // 全部展开/收起节点
    toggleAllNodes() {
        const toggleButton = document.getElementById('toggle-all-nodes-btn');
        const nodeContents = document.querySelectorAll('.node-content');
        const toggleIcons = document.querySelectorAll('.btn-toggle-node .toggle-icon');
        const nodeItems = document.querySelectorAll('.node-item');
        
        if (nodeContents.length === 0) return;
        
        // 检查当前状态 - 如果有任何一个节点是展开的，则全部收起
        const hasExpandedNodes = Array.from(nodeContents).some(content => content.style.display !== 'none');
        
        if (hasExpandedNodes) {
            // 全部收起
            nodeContents.forEach(content => {
                content.style.display = 'none';
            });
            toggleIcons.forEach(icon => {
                icon.textContent = '▶';
            });
            nodeItems.forEach(item => {
                item.classList.add('collapsed');
            });
            toggleButton.textContent = '全部展开';
        } else {
            // 全部展开
            nodeContents.forEach(content => {
                content.style.display = 'block';
            });
            toggleIcons.forEach(icon => {
                icon.textContent = '▼';
            });
            nodeItems.forEach(item => {
                item.classList.remove('collapsed');
            });
            toggleButton.textContent = '全部收起';
        }
    }
    
    // 添加新节点
    addNewNode() {
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.id === this.currentDialogueId);
        
        const newNode = this.createDefaultNode();
        dialogue.nodes.push(newNode);
        
        this.renderNodes(dialogue.nodes);
    }
    
    // 删除节点
    deleteNode(nodeId) {
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.id === this.currentDialogueId);
        
        if (dialogue.nodes.length <= 1) {
            alert('对话至少需要保留一个节点');
            return;
        }
        
        if (confirm('确定要删除这个节点吗？')) {
            dialogue.nodes = dialogue.nodes.filter(n => n.id !== nodeId);
            this.renderNodes(dialogue.nodes);
        }
    }
    
    // 显示通知消息
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
        `;
        
        // 根据类型设置背景色
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'warning':
                notification.style.backgroundColor = '#FF9800';
                break;
            case 'error':
                notification.style.backgroundColor = '#F44336';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    // 保存当前对话
    saveCurrentDialogue() {
        this.saveData();
        // 移除原来的alert，通知系统会处理消息显示
    }
    
    // 导出单个场景
    exportSingleScene() {
        if (!this.currentSceneId) return;
        
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        this.exportSceneToCSV(scene);
    }
    
    // 导出所有场景
    exportAllScenes() {
        if (this.scenes.length === 0) {
            alert('没有可导出的场景');
            return;
        }
        
        this.scenes.forEach(scene => {
            this.exportSceneToCSV(scene);
        });
    }
    
    // 导出场景为CSV
    exportSceneToCSV(scene) {
        // 按照C#导入器的期望格式创建标题，包含固定的选择项列
        const headers = [
            'dialogueID', 'nodeID', 'speakerID', 'speakerName', 'speakerType', 'emotion', 
            'text', 'nextNodeID', 'questID', 'rewardIDs', 'isFollow', 'conditionType', 'conditionValue',
            'choice1', 'choice1NextNode', 'choice2', 'choice2NextNode', 'choice3', 'choice3NextNode'
        ];
        
        const rows = [headers];
        
        scene.dialogues.forEach(dialogue => {
            dialogue.nodes.forEach(node => {
                // 基本数据行
                const baseRow = [
                    dialogue.id, // dialogueID (只使用对话ID，不包含场景名)
                    node.nodeID, // nodeID
                    node.speaker.speakerID, // speakerID
                    node.speaker.speakerName, // speakerName
                    node.speaker.speakerType, // speakerType
                    node.speaker.emotion, // emotion
                    node.text, // text
                    node.nextNodeID, // nextNodeID
                    node.questID, // questID
                    Array.isArray(node.rewardIDs) ? node.rewardIDs.join(';') : node.rewardIDs, // rewardIDs
                    node.isFollow ? 'TRUE' : 'FALSE', // isFollow (转换为大写)
                    node.conditionType, // conditionType
                    node.conditionValue // conditionValue
                ];
                
                // 添加固定的6列选择项数据
                const choicesData = ['', '', '', '', '', '']; // 初始化6个空列
                
                if (node.choices && node.choices.length > 0) {
                    // 最多支持3个选择项
                    for (let i = 0; i < Math.min(3, node.choices.length); i++) {
                        choicesData[i * 2] = node.choices[i].text || ''; // choice文本
                        choicesData[i * 2 + 1] = node.choices[i].nextNodeID || ''; // choice目标节点
                    }
                }
                
                rows.push([...baseRow, ...choicesData]);
            });
        });
        
        // 生成CSV内容
        const csvContent = rows.map(row => 
            row.map(cell => {
                const cellStr = String(cell || '').replace(/"/g, '""');
                return `"${cellStr}"`;
            }).join(',')
        ).join('\n');
        
        // 下载文件，使用时间戳确保文件名唯一
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // 生成唯一文件名，使用时间戳避免重复
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `${scene.name}_${timestamp}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
    
    // 显示模态框
    showModal(title, content, onConfirm) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-content').innerHTML = content;
        document.getElementById('modal-overlay').classList.add('active');
        
        // 设置确认按钮事件
        const confirmBtn = document.getElementById('modal-confirm');
        confirmBtn.onclick = onConfirm;
    }
    
    // 隐藏模态框
    hideModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new DialogueEditor();
});
