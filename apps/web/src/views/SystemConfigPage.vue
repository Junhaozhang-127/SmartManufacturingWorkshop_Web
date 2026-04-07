<script setup lang="ts">
import {
  fetchSystemConfiguration,
  upsertApprovalTemplate,
  upsertConfigItem,
  upsertDictionary,
  upsertDictionaryItem,
} from '@web/api/system';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';

const loading = ref(false);
const saving = ref(false);
const configData = ref<Awaited<ReturnType<typeof fetchSystemConfiguration>>['data'] | null>(null);
const selectedDictCode = ref('');
const dictionaryDialogVisible = ref(false);
const dictItemDialogVisible = ref(false);
const configDialogVisible = ref(false);
const templateDialogVisible = ref(false);
const dictionaryFormRef = ref<FormInstance>();
const dictItemFormRef = ref<FormInstance>();
const configFormRef = ref<FormInstance>();
const templateFormRef = ref<FormInstance>();

const dictionaryForm = reactive({
  dictCode: '',
  dictName: '',
  description: '',
  statusCode: 'ACTIVE',
});

const dictItemForm = reactive({
  dictCode: '',
  itemCode: '',
  itemLabel: '',
  itemValue: '',
  sortNo: 10,
  statusCode: 'ACTIVE',
});

const configForm = reactive({
  configCategory: '',
  configKey: '',
  configName: '',
  configValue: '',
  valueType: 'TEXT',
  statusCode: 'ACTIVE',
  remark: '',
  editable: true,
});

const templateForm = reactive({
  businessType: '',
  templateCode: '',
  templateName: '',
  statusCode: 'ACTIVE',
  nodes: [{ nodeKey: '', nodeName: '', sortNo: 10, approverRoleCode: '' }],
});

const selectedDictionary = computed(
  () => configData.value?.dictionaries.find((item) => item.dictCode === selectedDictCode.value) ?? null,
);

async function load() {
  loading.value = true;
  try {
    const response = await fetchSystemConfiguration();
    configData.value = response.data;
    const [firstDictionary] = response.data.dictionaries;
    if (!selectedDictCode.value && firstDictionary) {
      selectedDictCode.value = firstDictionary.dictCode;
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '系统配置加载失败');
  } finally {
    loading.value = false;
  }
}

function resetDictionaryForm() {
  dictionaryForm.dictCode = '';
  dictionaryForm.dictName = '';
  dictionaryForm.description = '';
  dictionaryForm.statusCode = 'ACTIVE';
}

function resetDictItemForm() {
  dictItemForm.dictCode = selectedDictCode.value;
  dictItemForm.itemCode = '';
  dictItemForm.itemLabel = '';
  dictItemForm.itemValue = '';
  dictItemForm.sortNo = 10;
  dictItemForm.statusCode = 'ACTIVE';
}

function resetConfigForm() {
  configForm.configCategory = '';
  configForm.configKey = '';
  configForm.configName = '';
  configForm.configValue = '';
  configForm.valueType = 'TEXT';
  configForm.statusCode = 'ACTIVE';
  configForm.remark = '';
  configForm.editable = true;
}

function resetTemplateForm() {
  templateForm.businessType = '';
  templateForm.templateCode = '';
  templateForm.templateName = '';
  templateForm.statusCode = 'ACTIVE';
  templateForm.nodes = [{ nodeKey: '', nodeName: '', sortNo: 10, approverRoleCode: '' }];
}

function openDictionaryDialog(item?: NonNullable<typeof configData.value>['dictionaries'][number]) {
  if (item) {
    dictionaryForm.dictCode = item.dictCode;
    dictionaryForm.dictName = item.dictName;
    dictionaryForm.description = item.description || '';
    dictionaryForm.statusCode = item.statusCode;
  } else {
    resetDictionaryForm();
  }
  dictionaryDialogVisible.value = true;
}

function openDictItemDialog(item?: NonNullable<typeof selectedDictionary.value>['items'][number]) {
  resetDictItemForm();
  if (item) {
    dictItemForm.itemCode = item.itemCode;
    dictItemForm.itemLabel = item.itemLabel;
    dictItemForm.itemValue = item.itemValue;
    dictItemForm.sortNo = item.sortNo;
    dictItemForm.statusCode = item.statusCode;
  }
  dictItemDialogVisible.value = true;
}

function openConfigDialog(item?: NonNullable<typeof configData.value>['configs'][number]) {
  if (item) {
    configForm.configCategory = item.configCategory;
    configForm.configKey = item.configKey;
    configForm.configName = item.configName;
    configForm.configValue = item.configValue;
    configForm.valueType = item.valueType;
    configForm.statusCode = item.statusCode;
    configForm.remark = item.remark || '';
    configForm.editable = item.editable;
  } else {
    resetConfigForm();
  }
  configDialogVisible.value = true;
}

function openTemplateDialog(item?: NonNullable<typeof configData.value>['approvalTemplates'][number]) {
  if (item) {
    templateForm.businessType = item.businessType;
    templateForm.templateCode = item.templateCode;
    templateForm.templateName = item.templateName;
    templateForm.statusCode = item.statusCode;
    templateForm.nodes = item.nodes.map((node) => ({
      nodeKey: node.nodeKey,
      nodeName: node.nodeName,
      sortNo: node.sortNo,
      approverRoleCode: node.approverRoleCode,
    }));
  } else {
    resetTemplateForm();
  }
  templateDialogVisible.value = true;
}

function addTemplateNode() {
  templateForm.nodes.push({ nodeKey: '', nodeName: '', sortNo: templateForm.nodes.length * 10 + 10, approverRoleCode: '' });
}

function removeTemplateNode(index: number) {
  templateForm.nodes.splice(index, 1);
}

async function saveDictionary() {
  if (!dictionaryFormRef.value) return;
  await dictionaryFormRef.value.validate();
  saving.value = true;
  try {
    await upsertDictionary(dictionaryForm);
    ElMessage.success('字典类型已保存');
    dictionaryDialogVisible.value = false;
    await load();
    selectedDictCode.value = dictionaryForm.dictCode;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '字典类型保存失败');
  } finally {
    saving.value = false;
  }
}

async function saveDictItem() {
  if (!dictItemFormRef.value) return;
  await dictItemFormRef.value.validate();
  saving.value = true;
  try {
    await upsertDictionaryItem(dictItemForm.dictCode, dictItemForm);
    ElMessage.success('字典项已保存');
    dictItemDialogVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '字典项保存失败');
  } finally {
    saving.value = false;
  }
}

async function saveConfig() {
  if (!configFormRef.value) return;
  await configFormRef.value.validate();
  saving.value = true;
  try {
    await upsertConfigItem(configForm);
    ElMessage.success('基础配置已保存');
    configDialogVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '基础配置保存失败');
  } finally {
    saving.value = false;
  }
}

async function saveTemplate() {
  if (!templateFormRef.value) return;
  await templateFormRef.value.validate();
  saving.value = true;
  try {
    await upsertApprovalTemplate(templateForm.businessType, templateForm);
    ElMessage.success('审批流基础配置已保存');
    templateDialogVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审批流配置保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section v-loading="loading" class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">SYS-01 Configuration</p>
      <h2>字典与基础配置</h2>
      <p>当前版本先开放字典项、成果级别、审批流基础配置和关键系统参数维护，严格受高权限角色控制。</p>
    </div>

    <el-tabs type="border-card">
      <el-tab-pane label="字典项">
        <div class="dashboard-approval-grid">
          <div class="panel-card">
            <div class="panel-card__header">
              <div>
                <p class="panel-card__eyebrow">Dictionary Types</p>
                <h2>字典类型</h2>
              </div>
              <el-button type="primary" @click="openDictionaryDialog()">新增字典</el-button>
            </div>
            <el-table :data="configData?.dictionaries || []" border stripe @row-click="selectedDictCode = $event.dictCode">
              <el-table-column prop="dictCode" label="编码" min-width="180" />
              <el-table-column prop="dictName" label="名称" min-width="180" />
              <el-table-column prop="statusCode" label="状态" width="120" />
              <el-table-column prop="systemFlag" label="系统预置" width="120">
                <template #default="{ row }">{{ row.systemFlag ? '是' : '否' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button link type="primary" @click.stop="openDictionaryDialog(row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="panel-card">
            <div class="panel-card__header">
              <div>
                <p class="panel-card__eyebrow">Dictionary Items</p>
                <h2>{{ selectedDictionary?.dictName || '字典项' }}</h2>
              </div>
              <el-button type="primary" :disabled="!selectedDictionary" @click="openDictItemDialog()">新增字典项</el-button>
            </div>
            <el-table :data="selectedDictionary?.items || []" border stripe>
              <el-table-column prop="itemCode" label="编码" min-width="160" />
              <el-table-column prop="itemLabel" label="标签" min-width="160" />
              <el-table-column prop="itemValue" label="值" min-width="160" />
              <el-table-column prop="sortNo" label="排序" width="100" />
              <el-table-column prop="statusCode" label="状态" width="120" />
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openDictItemDialog(row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="基础配置">
        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">Config Items</p>
              <h2>系统参数</h2>
            </div>
            <el-button type="primary" @click="openConfigDialog()">新增参数</el-button>
          </div>
          <el-table :data="configData?.configs || []" border stripe>
            <el-table-column prop="configCategory" label="分类" min-width="140" />
            <el-table-column prop="configKey" label="键" min-width="180" />
            <el-table-column prop="configName" label="名称" min-width="180" />
            <el-table-column prop="configValue" label="值" min-width="160" show-overflow-tooltip />
            <el-table-column prop="valueType" label="类型" width="120" />
            <el-table-column prop="statusCode" label="状态" width="120" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button link type="primary" @click="openConfigDialog(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="审批流基础配置">
        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">Approval Templates</p>
              <h2>审批流模板</h2>
            </div>
          </div>
          <el-table :data="configData?.approvalTemplates || []" border stripe>
            <el-table-column prop="businessType" label="业务类型" min-width="180" />
            <el-table-column prop="templateCode" label="模板编码" min-width="180" />
            <el-table-column prop="templateName" label="模板名称" min-width="180" />
            <el-table-column prop="statusCode" label="状态" width="120" />
            <el-table-column label="节点" min-width="260">
              <template #default="{ row }">
                {{ row.nodes.map((node: { nodeName: string; approverRoleCode: string }) => `${node.nodeName}(${node.approverRoleCode})`).join(' -> ') }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button link type="primary" @click="openTemplateDialog(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="dictionaryDialogVisible" title="字典类型" width="560px" @closed="resetDictionaryForm">
      <el-form ref="dictionaryFormRef" :model="dictionaryForm" label-width="100px">
        <el-form-item label="字典编码" prop="dictCode" :rules="[{ required: true, message: '请输入字典编码' }]">
          <el-input v-model="dictionaryForm.dictCode" />
        </el-form-item>
        <el-form-item label="字典名称" prop="dictName" :rules="[{ required: true, message: '请输入字典名称' }]">
          <el-input v-model="dictionaryForm.dictName" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="dictionaryForm.statusCode">
            <el-option label="ACTIVE" value="ACTIVE" />
            <el-option label="DISABLED" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="dictionaryForm.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictionaryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveDictionary">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dictItemDialogVisible" title="字典项" width="560px" @closed="resetDictItemForm">
      <el-form ref="dictItemFormRef" :model="dictItemForm" label-width="100px">
        <el-form-item label="所属字典">
          <el-input v-model="dictItemForm.dictCode" disabled />
        </el-form-item>
        <el-form-item label="项编码" prop="itemCode" :rules="[{ required: true, message: '请输入项编码' }]">
          <el-input v-model="dictItemForm.itemCode" />
        </el-form-item>
        <el-form-item label="项标签" prop="itemLabel" :rules="[{ required: true, message: '请输入项标签' }]">
          <el-input v-model="dictItemForm.itemLabel" />
        </el-form-item>
        <el-form-item label="项值" prop="itemValue" :rules="[{ required: true, message: '请输入项值' }]">
          <el-input v-model="dictItemForm.itemValue" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dictItemForm.sortNo" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="dictItemForm.statusCode">
            <el-option label="ACTIVE" value="ACTIVE" />
            <el-option label="DISABLED" value="DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictItemDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveDictItem">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="configDialogVisible" title="基础配置" width="620px" @closed="resetConfigForm">
      <el-form ref="configFormRef" :model="configForm" label-width="110px">
        <el-form-item label="配置分类" prop="configCategory" :rules="[{ required: true, message: '请输入配置分类' }]">
          <el-input v-model="configForm.configCategory" />
        </el-form-item>
        <el-form-item label="配置键" prop="configKey" :rules="[{ required: true, message: '请输入配置键' }]">
          <el-input v-model="configForm.configKey" />
        </el-form-item>
        <el-form-item label="配置名称" prop="configName" :rules="[{ required: true, message: '请输入配置名称' }]">
          <el-input v-model="configForm.configName" />
        </el-form-item>
        <el-form-item label="配置值" prop="configValue" :rules="[{ required: true, message: '请输入配置值' }]">
          <el-input v-model="configForm.configValue" type="textarea" />
        </el-form-item>
        <el-form-item label="值类型">
          <el-select v-model="configForm.valueType">
            <el-option label="TEXT" value="TEXT" />
            <el-option label="NUMBER" value="NUMBER" />
            <el-option label="JSON" value="JSON" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="configForm.statusCode">
            <el-option label="ACTIVE" value="ACTIVE" />
            <el-option label="DISABLED" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="configForm.remark" />
        </el-form-item>
        <el-form-item label="可编辑">
          <el-switch v-model="configForm.editable" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateDialogVisible" title="审批流基础配置" width="760px" @closed="resetTemplateForm">
      <el-form ref="templateFormRef" :model="templateForm" label-width="110px">
        <el-form-item label="业务类型" prop="businessType" :rules="[{ required: true, message: '请输入业务类型' }]">
          <el-input v-model="templateForm.businessType" />
        </el-form-item>
        <el-form-item label="模板编码" prop="templateCode" :rules="[{ required: true, message: '请输入模板编码' }]">
          <el-input v-model="templateForm.templateCode" />
        </el-form-item>
        <el-form-item label="模板名称" prop="templateName" :rules="[{ required: true, message: '请输入模板名称' }]">
          <el-input v-model="templateForm.templateName" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="templateForm.statusCode">
            <el-option label="ACTIVE" value="ACTIVE" />
            <el-option label="DISABLED" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="审批节点">
          <div class="template-node-list">
            <div v-for="(node, index) in templateForm.nodes" :key="`${index}-${node.nodeKey}`" class="template-node-row">
              <el-input v-model="node.nodeKey" placeholder="节点编码" />
              <el-input v-model="node.nodeName" placeholder="节点名称" />
              <el-input-number v-model="node.sortNo" :min="1" />
              <el-input v-model="node.approverRoleCode" placeholder="审批角色" />
              <el-button text type="danger" @click="removeTemplateNode(index)">删除</el-button>
            </div>
            <el-button plain @click="addTemplateNode">新增节点</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.template-node-list {
  width: 100%;
  display: grid;
  gap: 12px;
}

.template-node-row {
  display: grid;
  grid-template-columns: 1fr 1fr 120px 1fr 80px;
  gap: 12px;
  align-items: center;
}
</style>
