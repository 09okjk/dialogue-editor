// 全局状态管理
class DialogueEditor {
    constructor() {
        // 数据模型
        this.scenes = []; // 用于在UI中组织对话
        this.currentSceneId = null;
        this.currentDialogueId = null; // 注意：现在是字符串ID，如 'diag_1'

        // ID生成器
        this.nextSceneId = 1;
        this.nextDialogueId = 1;
        this.nextNodeInternalId = 1; // 用于保证节点的唯一性

        this.isOnline = navigator.onLine;
        
        // 可用的条件类型
        this.conditionTypes = [
            'QuestCompletedCondition', 'ItemAcquiredCondition', 'SceneNameCondition', 
            'NpcCheckCondition', 'DialogueCompletedCondition', 'EnemyClearedCondition'
        ];
        
        window.addEventListener('online', () => { this.isOnline = true; this.syncWithServer(); });
        window.addEventListener('offline', () => { this.isOnline = false; });
        
        this.initializeEventListeners();
        this.loadDataFromServer();
    }
    // 初始化ID计数器
    initializeIds() {
        let maxSceneId = 0;
        let maxDialogueIdNum = 0;
        let maxNodeId = 0;
        
        this.scenes.forEach(scene => {
            if (scene.id > maxSceneId) maxSceneId = scene.id;
            scene.dialogues.forEach(dialogue => {
                const idNum = parseInt((dialogue.dialogueID || 'diag_0').split('_')[1]);
                if (idNum > maxDialogueIdNum) maxDialogueIdNum = idNum;
                
                dialogue.nodes.forEach(node => {
                    if (node.internalId > maxNodeId) maxNodeId = node.internalId;
                });
            });
        });
        
        this.nextSceneId = maxSceneId + 1;
        this.nextDialogueId = maxDialogueIdNum + 1;
        this.nextNodeInternalId = maxNodeId + 1;
    }
    
    // 加载数据从服务器
    async loadDataFromServer() {
        try {
            console.log('尝试从服务器加载数据...');
            const response = await fetch('/api/data');
            console.log('服务器响应状态:', response.status, response.statusText);
            
            if (response.ok) {
                const result = await response.json();
                console.log('服务器响应数据:', result);
                if (result.success) {
                    this.scenes = result.data || [];
                    this.initializeIds();
                    this.renderScenes();
                    console.log('数据从服务器加载成功，场景数量:', this.scenes.length);
                    this.showNotification('数据已从服务器加载', 'success');
                } else {
                    console.error('服务器返回错误:', result.message);
                    this.showNotification('服务器数据加载失败，使用本地数据', 'warning');
                    this.loadFromLocalStorage(); // 回退到本地存储
                }
            } else {
                console.error('服务器响应错误:', response.status, response.statusText);
                this.showNotification('无法连接到服务器，使用本地数据', 'warning');
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('加载数据时出错:', error.message);
            console.error('错误详情:', error);
            this.showNotification('网络错误，使用本地数据', 'warning');
            this.loadFromLocalStorage();
        }
    }
    
    // 从本地存储加载数据（离线模式或服务器不可用时的回退方案）
    loadFromLocalStorage() {
        const localData = localStorage.getItem('dialogueScenes');
        this.scenes = localData ? JSON.parse(localData) : [];
        this.initializeIds();
        this.renderScenes();
    }
    
    // 保存数据到服务器
    async saveData() {
        localStorage.setItem('dialogueScenes', JSON.stringify(this.scenes));
        if (this.isOnline) {
            try {
                const response = await fetch('/api/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: this.scenes })
                });
                if (response.ok) {
                    this.showNotification('数据已保存并同步', 'success');
                } else { this.showNotification('服务器同步失败', 'warning'); }
            } catch (error) { this.showNotification('网络错误，数据已本地保存', 'warning'); }
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
        document.getElementById('new-scene-btn').addEventListener('click', () => this.showNewSceneModal());
        document.getElementById('new-dialogue-btn').addEventListener('click', () => this.createNewDialogue());
        document.getElementById('export-scene-dialogues-btn').addEventListener('click', () => this.exportCurrentSceneDialogues());
        document.getElementById('export-all-btn').addEventListener('click', () => this.exportAllDialogues());
        document.getElementById('back-btn').addEventListener('click', () => this.showMainPage());
        document.getElementById('save-dialogue-btn').addEventListener('click', () => this.saveCurrentDialogue());
        document.getElementById('add-node-btn').addEventListener('click', () => this.addNewNode());
        document.getElementById('toggle-all-nodes-btn').addEventListener('click', () => this.toggleAllNodes());
        document.getElementById('add-condition-btn').addEventListener('click', () => this.addCondition());
        document.getElementById('required-count-input').addEventListener('input', (e) => this.updateRequiredCount(e.target.value));
        document.getElementById('modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('modal-cancel').addEventListener('click', () => this.hideModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') this.hideModal();
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
        
        if (scene) {
            document.getElementById('current-scene-title').textContent = scene.name;
            document.getElementById('new-dialogue-btn').disabled = false;
            document.getElementById('export-scene-dialogues-btn').disabled = false;
            
            this.renderScenes();
            this.renderDialogues();
        }
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
        
        const newDialogueId = `diag_${this.nextDialogueId++}`;
        const defaultNode = this.createDefaultNode('node_1');

        const newDialogue = {
            dialogueID: newDialogueId,
            state: 2, // WithOutStart
            currentNodeID: defaultNode.nodeID,
            conditions: {
                requiredCount: 1,
                conditions: []
            },
            nodes: [defaultNode]
        };
        
        scene.dialogues.push(newDialogue);
        this.saveData();
        this.renderDialogues();
    }
    
    // 创建默认节点
    createDefaultNode(nodeID) {
        return {
            internalId: this.nextNodeInternalId++, // 内部唯一ID，用于UI操作
            nodeID: nodeID,
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
            choices: []
        };
    }
    
    // 渲染对话列表
    renderDialogues() {
        const dialogueList = document.getElementById('dialogue-list');
        if (!this.currentSceneId) {
            dialogueList.innerHTML = `<div class="empty-state"><p>请先选择一个场景查看对话</p></div>`;
            return;
        }
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        if (!scene || scene.dialogues.length === 0) {
            dialogueList.innerHTML = `<div class="empty-state"><p>该场景暂无对话，点击"新建对话"开始创建</p></div>`;
            return;
        }
        dialogueList.innerHTML = scene.dialogues.map(dialogue => `
            <div class="dialogue-item">
                <div class="dialogue-info">
                    <div class="dialogue-id-section">
                        <span class="dialogue-id-label">对话 ID:</span>
                        <input type="text" class="form-input-inline" value="${dialogue.dialogueID}" data-dialogue-id="${dialogue.dialogueID}">
                    </div>
                    <div class="dialogue-meta">${dialogue.nodes.length} 个节点</div>
                </div>
                <div class="dialogue-actions">
                    <button class="btn btn-primary btn-edit-dialogue" data-dialogue-id="${dialogue.dialogueID}">编辑</button>
                    <button class="btn btn-danger btn-delete-dialogue" data-dialogue-id="${dialogue.dialogueID}">删除</button>
                </div>
            </div>
        `).join('');

        dialogueList.querySelectorAll('.btn-edit-dialogue').forEach(btn => {
            btn.addEventListener('click', () => this.editDialogue(btn.dataset.dialogueId));
        });
        dialogueList.querySelectorAll('.btn-delete-dialogue').forEach(btn => {
            btn.addEventListener('click', () => this.deleteDialogue(btn.dataset.dialogueId));
        });
        dialogueList.querySelectorAll('.form-input-inline').forEach(input => {
            input.addEventListener('change', (e) => this.updateDialogueId(e.target.dataset.dialogueId, e.target.value));
        });
    }

    
    // 编辑对话
    updateDialogueId(oldId, newId) {
        if (!newId.trim()) {
            alert('对话ID不能为空');
            this.renderDialogues();
            return;
        }
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        if (scene.dialogues.some(d => d.dialogueID === newId && d.dialogueID !== oldId)) {
            alert('该对话ID已存在');
            this.renderDialogues();
            return;
        }
        const dialogue = scene.dialogues.find(d => d.dialogueID === oldId);
        if (dialogue) {
            dialogue.dialogueID = newId;
            if (this.currentDialogueId === oldId) {
                this.currentDialogueId = newId;
            }
            this.saveData();
            this.renderDialogues();
        }
    }
    
    // 删除对话
    deleteDialogue(dialogueId) {
        if (confirm(`确定要删除对话 "${dialogueId}" 吗？`)) {
            const scene = this.scenes.find(s => s.id === this.currentSceneId);
            scene.dialogues = scene.dialogues.filter(d => d.dialogueID !== dialogueId);
            this.saveData();
            this.renderDialogues();
        }
    }
    
    // 编辑对话ID
    editDialogue(dialogueId) {
        this.currentDialogueId = dialogueId;
        document.getElementById('edit-dialogue-title').textContent = `编辑对话: ${dialogueId}`;
        this.showEditPage();
        const dialogue = this.getCurrentDialogue();
        this.renderDialogueConditions(dialogue);
        this.renderNodes(dialogue.nodes);
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

        // --- 新的条件编辑器逻辑 ---
    
        renderDialogueConditions(dialogue) {
            document.getElementById('required-count-input').value = dialogue.conditions.requiredCount;
            const container = document.getElementById('conditions-container');
            if (!dialogue.conditions.conditions) dialogue.conditions.conditions = [];
    
            if (dialogue.conditions.conditions.length === 0) {
                container.innerHTML = '<div class="empty-state-small"><p>暂无条件，点击"添加条件"开始。</p></div>';
                return;
            }
    
            container.innerHTML = dialogue.conditions.conditions.map((cond, index) => {
                const typeSelector = `
                    <select class="field-input condition-type-selector" data-index="${index}">
                        ${this.conditionTypes.map(type => `<option value="${type}" ${cond.$type.includes(type) ? 'selected' : ''}>${type}</option>`).join('')}
                    </select>`;
                
                return `
                    <div class="condition-item" data-index="${index}">
                        <div class="condition-header">
                            ${typeSelector}
                            <button class="btn btn-danger btn-remove-condition" data-index="${index}">移除</button>
                        </div>
                        <div class="condition-body">
                            ${this.renderConditionFields(cond, index)}
                        </div>
                    </div>`;
            }).join('');
    
            container.querySelectorAll('.condition-type-selector').forEach(sel => sel.addEventListener('change', (e) => this.changeConditionType(e.target.dataset.index, e.target.value)));
            container.querySelectorAll('.btn-remove-condition').forEach(btn => btn.addEventListener('click', (e) => this.removeCondition(e.target.dataset.index)));
            container.querySelectorAll('.condition-field').forEach(input => input.addEventListener('input', (e) => this.updateConditionField(e)));
        }
    
        renderConditionFields(condition, index) {
            const type = condition.$type.split(',')[0].split('.').pop();
            switch (type) {
                case 'QuestCompletedCondition':
                case 'DialogueCompletedCondition':
                case 'EnemyClearedCondition':
                    const fieldName = {
                        'QuestCompletedCondition': 'questIDs',
                        'DialogueCompletedCondition': 'dialogueIDs',
                        'EnemyClearedCondition': 'enemyGroupIDs'
                    }[type];
                    return `
                        <div class="field-group">
                            <label class="field-label">ID列表 (用分号';'分隔)</label>
                            <input type="text" class="field-input condition-field" data-index="${index}" data-field="${fieldName}" value="${condition[fieldName]?.join(';') || ''}">
                        </div>`;
                case 'ItemAcquiredCondition':
                    return `
                        <div class="field-group">
                            <label class="field-label">物品条件 (格式: itemID1:数量1;itemID2:数量2)</label>
                            <input type="text" class="field-input condition-field" data-index="${index}" data-field="itemConditions" value="${(condition.itemConditions || []).map(ic => `${ic.itemID}:${ic.requiredAmount}`).join(';')}">
                        </div>`;
                case 'SceneNameCondition':
                    return `
                        <div class="field-group">
                            <label class="field-label">场景名称</label>
                            <input type="text" class="field-input condition-field" data-index="${index}" data-field="sceneName" value="${condition.sceneName || ''}">
                        </div>`;
                case 'NpcCheckCondition':
                    return `
                        <div class="field-group">
                            <label class="field-label">NPC ID</label>
                            <input type="text" class="field-input condition-field" data-index="${index}" data-field="npcID" value="${condition.npcID || ''}">
                        </div>`;
                default:
                    return '<span>未知条件类型</span>';
            }
        }
    
        addCondition() {
            const dialogue = this.getCurrentDialogue();
            const newCondition = this.createConditionObject(this.conditionTypes[0]);
            dialogue.conditions.conditions.push(newCondition);
            this.renderDialogueConditions(dialogue);
        }
    
        removeCondition(index) {
            const dialogue = this.getCurrentDialogue();
            dialogue.conditions.conditions.splice(index, 1);
            this.renderDialogueConditions(dialogue);
        }
    
        changeConditionType(index, newType) {
            const dialogue = this.getCurrentDialogue();
            dialogue.conditions.conditions[index] = this.createConditionObject(newType);
            this.renderDialogueConditions(dialogue);
        }
    
        createConditionObject(type) {
            const base = { $type: `Dialogue.${type}, Assembly-CSharp` };
            switch (type) {
                case 'QuestCompletedCondition': base.questIDs = []; break;
                case 'ItemAcquiredCondition': base.itemConditions = []; break;
                case 'SceneNameCondition': base.sceneName = ''; break;
                case 'NpcCheckCondition': base.npcID = ''; break;
                case 'DialogueCompletedCondition': base.dialogueIDs = []; break;
                case 'EnemyClearedCondition': base.enemyGroupIDs = []; break;
            }
            return base;
        }
    
        updateRequiredCount(value) {
            const dialogue = this.getCurrentDialogue();
            dialogue.conditions.requiredCount = parseInt(value, 10) || 0;
        }
    
        updateConditionField(event) {
            const { index, field } = event.target.dataset;
            const value = event.target.value;
            const dialogue = this.getCurrentDialogue();
            const condition = dialogue.conditions.conditions[index];
    
            if (field === 'itemConditions') {
                condition.itemConditions = value.split(';').map(pair => {
                    const [itemID, requiredAmount] = pair.split(':');
                    return { itemID: itemID?.trim(), requiredAmount: parseInt(requiredAmount, 10) || 0 };
                }).filter(ic => ic.itemID);
            } else if (Array.isArray(condition[field])) {
                condition[field] = value.split(';').map(id => id.trim()).filter(id => id);
            } else {
                condition[field] = value;
            }
        }
    
    // 渲染节点
    renderNodes(nodes) {
        const container = document.getElementById('nodes-container');
        const speakerTypes = ['Player', 'Npc', 'System', 'PlayerChoice', 'NpcNotice'];
        const emotions = ['Neutral', 'NeutralCamera', 'Happy', 'HappyCamera', 'Sad', 'SadCamera', 'Angry', 'AngryCamera', 'Surprised', 'SurprisedCamera', 'Smile', 'SmileCamera', 'SmileGlasses', 'Wink', 'WinkCamera', 'Confused', 'ConfusedCamera'];
        
        container.innerHTML = nodes.map((node, index) => `
            <div class="node-item" data-node-id="${node.internalId}">
                <div class="node-header">
                    <div class="node-title-section">
                        <button class="btn-toggle-node"><span class="toggle-icon">▼</span></button>
                        <div class="node-title">节点 ${index + 1}</div>
                    </div>
                    <div class="node-actions">
                        <button class="btn btn-success btn-add-choice" data-node-id="${node.internalId}">添加选择项</button>
                        <button class="btn btn-danger btn-delete-node" data-node-id="${node.internalId}">删除节点</button>
                    </div>
                </div>
                <div class="node-content">
                    <div class="node-fields">
                        <div class="field-group"><label>节点ID</label><input type="text" class="field-input" data-field="nodeID" value="${node.nodeID}"></div>
                        <div class="field-group"><label>说话者ID</label><input type="text" class="field-input" data-field="speaker.speakerID" value="${node.speaker.speakerID}"></div>
                        <div class="field-group"><label>说话者名称</label><input type="text" class="field-input" data-field="speaker.speakerName" value="${node.speaker.speakerName}"></div>
                        <div class="field-group"><label>说话者类型</label><select class="field-input" data-field="speaker.speakerType">${speakerTypes.map(t => `<option value="${t}" ${node.speaker.speakerType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
                        <div class="field-group"><label>情绪</label><select class="field-input" data-field="speaker.emotion">${emotions.map(e => `<option value="${e}" ${node.speaker.emotion === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
                        <div class="field-group"><label>下一节点ID</label><input type="text" class="field-input" data-field="nextNodeID" value="${node.nextNodeID}"></div>
                        <div class="field-group"><label>任务ID</label><input type="text" class="field-input" data-field="questID" value="${node.questID}"></div>
                        <div class="field-group"><label>奖励ID列表 (;分隔)</label><input type="text" class="field-input" data-field="rewardIDs" value="${Array.isArray(node.rewardIDs) ? node.rewardIDs.join(';') : ''}"></div>
                        <div class="field-group"><label>是否跟随</label><select class="field-input" data-field="isFollow"><option value="false" ${!node.isFollow ? 'selected' : ''}>false</option><option value="true" ${node.isFollow ? 'selected' : ''}>true</option></select></div>
                        <div class="field-group span-2"><label>对话文本</label><textarea class="field-input field-textarea" data-field="text">${node.text}</textarea></div>
                    </div>
                    <div class="choices-section">
                        <h4>选择项</h4>
                        <div class="choices-container" data-node-id="${node.internalId}">
                            ${(node.choices || []).map((choice, choiceIndex) => `
                                <div class="choice-item">
                                    <div class="field-group"><label>选择项文本</label><input type="text" class="field-input choice-text" data-choice-index="${choiceIndex}" value="${choice.text}"></div>
                                    <div class="field-group"><label>目标节点ID</label><input type="text" class="field-input choice-next" data-choice-index="${choiceIndex}" value="${choice.nextNodeID}"></div>
                                    <button class="btn btn-danger btn-remove-choice" data-choice-index="${choiceIndex}">删除</button>
                                </div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>`).join('');
        
        container.querySelectorAll('.node-item').forEach(item => {
            const nodeId = item.dataset.nodeId;
            item.querySelectorAll('.field-input').forEach(input => input.addEventListener('input', (e) => this.updateNodeField(nodeId, e.target.dataset.field, e.target.value)));
            item.querySelectorAll('.choice-text, .choice-next').forEach(input => input.addEventListener('input', (e) => this.updateChoice(nodeId, e.target.dataset.choiceIndex, e.target.classList.contains('choice-text') ? 'text' : 'nextNodeID', e.target.value)));
            item.querySelector('.btn-add-choice').addEventListener('click', () => this.addChoice(nodeId));
            item.querySelectorAll('.btn-remove-choice').forEach(btn => btn.addEventListener('click', (e) => this.removeChoice(nodeId, e.target.dataset.choiceIndex)));
            item.querySelector('.btn-delete-node').addEventListener('click', () => this.deleteNode(nodeId));
            item.querySelector('.btn-toggle-node').addEventListener('click', (e) => this.toggleNode(e.currentTarget));
        });
    }
    
    // 更新节点字段
    updateNodeField(nodeId, field, value) {
        const node = this.getNodeByInternalId(nodeId);
        if (!node) return;
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            node[parent][child] = value;
        } else if (field === 'rewardIDs') {
            node.rewardIDs = value ? value.split(';').map(id => id.trim()).filter(id => id) : [];
        } else if (field === 'isFollow') {
            node.isFollow = value === 'true';
        } else {
            node[field] = value;
        }
    }
    
    // 添加选择项
    addChoice(nodeId) {
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.dialogueID === this.currentDialogueId);
        const node = dialogue.nodes.find(n => n.internalId == nodeId);
        
        if (node) {
            if (!node.choices) node.choices = [];
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
        const dialogue = scene.dialogues.find(d => d.dialogueID === this.currentDialogueId);
        const node = dialogue.nodes.find(n => n.internalId == nodeId);
        
        if (node && node.choices && node.choices[choiceIndex]) {
            node.choices[choiceIndex][field] = value;
        }
    }
    
    // 删除选择项
    removeChoice(nodeId, choiceIndex) {
        const scene = this.scenes.find(s => s.id === this.currentSceneId);
        const dialogue = scene.dialogues.find(d => d.dialogueID === this.currentDialogueId);
        const node = dialogue.nodes.find(n => n.internalId == nodeId);
        
        if (node && node.choices && node.choices[choiceIndex]) {
            node.choices.splice(choiceIndex, 1);
            this.renderNodes(dialogue.nodes);
        }
    }
    
    // 切换节点展开/收起状态
    toggleNode(toggleButton) {
        const nodeItem = toggleButton.closest('.node-item');
        const nodeContent = nodeItem.querySelector('.node-content');
        const toggleIcon = toggleButton.querySelector('.toggle-icon');
        
        if (nodeContent && toggleIcon) {
            const isCollapsed = nodeContent.style.display === 'none';
            
            if (isCollapsed) {
                // 展开
                nodeContent.style.display = 'block';
                toggleIcon.textContent = '▼';
                nodeItem.classList.remove('collapsed');
            } else {
                // 收起
                nodeContent.style.display = 'none';
                toggleIcon.textContent = '▶';
                nodeItem.classList.add('collapsed');
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
        const dialogue = this.getCurrentDialogue();
        const newNumericId = Math.max(0, ...dialogue.nodes.map(n => parseInt(n.nodeID.split('_')[1] || 0))) + 1;
        const newNode = this.createDefaultNode(`node_${newNumericId}`);
        dialogue.nodes.push(newNode);
        this.renderNodes(dialogue.nodes);
    }
    
    // 删除节点
    deleteNode(nodeId) {
        const dialogue = this.getCurrentDialogue();
        if (dialogue.nodes.length <= 1) {
            alert('对话至少需要一个节点');
            return;
        }
        if (confirm('确定删除此节点吗？')) {
            dialogue.nodes = dialogue.nodes.filter(n => n.internalId != nodeId);
            this.renderNodes(dialogue.nodes);
        }
    }

        // --- 导出为 JSON ---
        exportCurrentSceneDialogues() {
            if (!this.currentSceneId) return;
            const scene = this.scenes.find(s => s.id === this.currentSceneId);
            if (scene.dialogues.length === 0) {
                alert('此场景没有可导出的对话');
                return;
            }
            scene.dialogues.forEach(dialogue => this.exportDialogueToJson(dialogue));
        }
    
        exportAllDialogues() {
            if (this.scenes.length === 0) {
                alert('没有任何可导出的对话');
                return;
            }
            this.scenes.forEach(scene => {
                scene.dialogues.forEach(dialogue => this.exportDialogueToJson(dialogue));
            });
        }
    
        exportDialogueToJson(dialogue) {
            // 创建一个深拷贝，并移除仅用于UI的 internalId
            const exportData = JSON.parse(JSON.stringify(dialogue));
            delete exportData.internalId; // 移除对话对象的顶层ID（如果存在）
            exportData.nodes.forEach(node => delete node.internalId);
    
            const jsonString = JSON.stringify(exportData, null, 2); // 格式化JSON
            const blob = new Blob([jsonString], { type: 'application/json' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${dialogue.dialogueID}.json`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        
        // --- 辅助函数 ---
        getCurrentDialogue() {
            if (!this.currentSceneId || !this.currentDialogueId) return null;
            const scene = this.scenes.find(s => s.id === this.currentSceneId);
            return scene?.dialogues.find(d => d.dialogueID === this.currentDialogueId);
        }
    
        getNodeByInternalId(internalId) {
            const dialogue = this.getCurrentDialogue();
            return dialogue?.nodes.find(n => n.internalId == internalId);
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
