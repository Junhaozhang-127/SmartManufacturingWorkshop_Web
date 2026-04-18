<script setup lang="ts">
import { RoleCode } from '@smw/shared';
import { fetchKnowledgeContents,type HomeSection, publishCreationContent } from '@web/api/creation';
import {
  createPortalAdminCarousel,
  createPortalAdminContent,
  deletePortalAdminCarousel,
  deletePortalAdminContent,
  fetchPortalAdminCarousel,
  fetchPortalAdminContactConfig,
  fetchPortalAdminContents,
  type PortalContentType,
  updatePortalAdminCarousel,
  updatePortalAdminContent,
  uploadPortalAsset,
  upsertPortalAdminContactConfig,
} from '@web/api/portal';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage, ElMessageBox, type UploadRequestOptions } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

type ManageTab = 'CAROUSEL' | PortalContentType | 'CONTACT';

const authStore = useAuthStore();
const router = useRouter();
const canManage = computed(() => [RoleCode.TEACHER, RoleCode.MINISTER].includes(authStore.activeRoleCode ?? RoleCode.MEMBER));

const activeTab = ref<ManageTab>('CAROUSEL');

const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'INACTIVE' },
] as const;

const tabOptions: Array<{ key: ManageTab; label: string }> = [
  { key: 'CAROUSEL', label: '首页轮播' },
  { key: 'NEWS', label: '资讯' },
  { key: 'NOTICE', label: '通知' },
  { key: 'ACHIEVEMENT', label: '优秀成果展示' },
  { key: 'COMPETITION', label: '竞赛风采' },
  { key: 'MEMBER_INTRO', label: '成员简介' },
  { key: 'CONTACT', label: '联系我们配置' },
];

const carouselLoading = ref(false);
const carouselRows = ref<Awaited<ReturnType<typeof fetchPortalAdminCarousel>>['data']['items']>([]);
const carouselTotal = ref(0);
const carouselQuery = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '' as '' | 'ACTIVE' | 'INACTIVE',
});

const carouselDialogVisible = ref(false);
const carouselSaving = ref(false);
const carouselEditingId = ref<string | null>(null);
const carouselForm = reactive({
  title: '',
  summary: '',
  imageStorageKey: '',
  imageFileName: '',
  imageUrl: '',
  targetUrl: '',
  themeCode: 'blue' as 'blue' | 'gold' | 'teal',
  sortNo: 0,
  statusCode: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
});

const contentLoading = ref(false);
const contentRows = ref<Awaited<ReturnType<typeof fetchPortalAdminContents>>['data']['items']>([]);
const contentTotal = ref(0);
const contentQuery = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '' as '' | 'ACTIVE' | 'INACTIVE',
});

const contentDialogVisible = ref(false);
const contentSaving = ref(false);
const contentEditingId = ref<string | null>(null);
const contentForm = reactive({
  title: '',
  summary: '',
  body: '',
  coverStorageKey: '',
  coverFileName: '',
  coverUrl: '',
  linkUrl: '',
  sortNo: 0,
  statusCode: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
});

const currentContentType = computed(() =>
  activeTab.value === 'CAROUSEL' || activeTab.value === 'CONTACT' ? null : activeTab.value,
);
const importHomeSection = computed<HomeSection>(() =>
  activeTab.value === 'CAROUSEL' ? 'CAROUSEL' : activeTab.value === 'CONTACT' ? 'NEWS' : (activeTab.value as HomeSection),
);

const knowledgeVisible = ref(false);
const knowledgeLoading = ref(false);
const knowledgeRows = ref<Awaited<ReturnType<typeof fetchKnowledgeContents>>['data']['items']>([]);
const knowledgeTotal = ref(0);
const knowledgeQuery = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
});

const contactLoading = ref(false);
const contactSaving = ref(false);
const contactForm = reactive({
  contactEmail: '',
  contactAddress: '',
  publicAccountQrStorageKey: '',
  publicAccountQrFileName: '',
  publicAccountQrUrl: '',
});

async function loadContactConfig() {
  contactLoading.value = true;
  try {
    const response = await fetchPortalAdminContactConfig();
    contactForm.contactEmail = response.data.contactEmail ?? '';
    contactForm.contactAddress = response.data.contactAddress ?? '';
    contactForm.publicAccountQrStorageKey = response.data.publicAccountQr?.storageKey ?? '';
    contactForm.publicAccountQrFileName = response.data.publicAccountQr?.fileName ?? '';
    contactForm.publicAccountQrUrl = response.data.publicAccountQr?.previewUrl ?? '';
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '联系我们配置加载失败');
  } finally {
    contactLoading.value = false;
  }
}

async function saveContactConfig() {
  contactSaving.value = true;
  try {
    await upsertPortalAdminContactConfig({
      contactEmail: contactForm.contactEmail.trim() || null,
      contactAddress: contactForm.contactAddress.trim() || null,
      publicAccountQrStorageKey: contactForm.publicAccountQrStorageKey || null,
      publicAccountQrFileName: contactForm.publicAccountQrFileName || null,
    });
    ElMessage.success('已保存');
    await loadContactConfig();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    contactSaving.value = false;
  }
}

async function handlePublicAccountQrUpload(option: UploadRequestOptions) {
  try {
    const response = await uploadPortalAsset(option.file as File);
    contactForm.publicAccountQrStorageKey = response.data.storageKey;
    contactForm.publicAccountQrFileName = response.data.fileName;
    contactForm.publicAccountQrUrl = response.data.previewUrl;
    option.onSuccess?.(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : '图片上传失败';
    option.onError?.(Object.assign(new Error(message), { status: 500, method: 'POST', url: '/portal/admin/upload' }));
  }
}

function clearPublicAccountQr() {
  contactForm.publicAccountQrStorageKey = '';
  contactForm.publicAccountQrFileName = '';
  contactForm.publicAccountQrUrl = '';
}

async function loadKnowledge() {
  knowledgeLoading.value = true;
  try {
    const response = await fetchKnowledgeContents({
      page: knowledgeQuery.page,
      pageSize: knowledgeQuery.pageSize,
      keyword: knowledgeQuery.keyword.trim() || undefined,
    });
    knowledgeRows.value = response.data.items;
    knowledgeTotal.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '智库内容加载失败');
  } finally {
    knowledgeLoading.value = false;
  }
}

function openKnowledgeImport() {
  knowledgeVisible.value = true;
  knowledgeQuery.page = 1;
  void loadKnowledge();
}

function openKnowledgeDetail(id: string) {
  void router.push(`/knowledge/contents/${id}`);
}

async function importFromKnowledge(id: string) {
  const target = importHomeSection.value;
  try {
    await publishCreationContent(id, {
      recommendToHome: true,
      homeSection: target,
    });
    ElMessage.success('已导入到首页展示位');
    knowledgeVisible.value = false;
    if (activeTab.value === 'CAROUSEL') {
      await loadCarousel();
    } else {
      await loadContents();
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '导入失败（可能已导入或无可更新项）');
  }
}

function resetCarouselForm() {
  carouselEditingId.value = null;
  carouselForm.title = '';
  carouselForm.summary = '';
  carouselForm.imageStorageKey = '';
  carouselForm.imageFileName = '';
  carouselForm.imageUrl = '';
  carouselForm.targetUrl = '';
  carouselForm.themeCode = 'blue';
  carouselForm.sortNo = 0;
  carouselForm.statusCode = 'ACTIVE';
}

function resetContentForm() {
  contentEditingId.value = null;
  contentForm.title = '';
  contentForm.summary = '';
  contentForm.body = '';
  contentForm.coverStorageKey = '';
  contentForm.coverFileName = '';
  contentForm.coverUrl = '';
  contentForm.linkUrl = '';
  contentForm.sortNo = 0;
  contentForm.statusCode = 'ACTIVE';
}

async function loadCarousel() {
  carouselLoading.value = true;
  try {
    const response = await fetchPortalAdminCarousel(carouselQuery);
    carouselRows.value = response.data.items;
    carouselTotal.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '轮播列表加载失败');
  } finally {
    carouselLoading.value = false;
  }
}

async function loadContents() {
  const contentType = currentContentType.value;
  if (!contentType) return;
  contentLoading.value = true;
  try {
    const response = await fetchPortalAdminContents({
      ...contentQuery,
      contentType,
    });
    contentRows.value = response.data.items;
    contentTotal.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '内容列表加载失败');
  } finally {
    contentLoading.value = false;
  }
}

function openCarouselCreate() {
  resetCarouselForm();
  carouselDialogVisible.value = true;
}

function openCarouselEdit(row: (typeof carouselRows.value)[number]) {
  carouselEditingId.value = row.id;
  carouselForm.title = row.title;
  carouselForm.summary = row.summary ?? '';
  carouselForm.imageStorageKey = row.imageStorageKey ?? '';
  carouselForm.imageFileName = row.imageFileName ?? '';
  carouselForm.imageUrl = row.imageUrl ?? '';
  carouselForm.targetUrl = row.targetUrl ?? '';
  carouselForm.themeCode = row.themeCode ?? 'blue';
  carouselForm.sortNo = row.sortNo ?? 0;
  carouselForm.statusCode = row.statusCode;
  carouselDialogVisible.value = true;
}

async function saveCarousel() {
  carouselSaving.value = true;
  try {
    if (!carouselForm.title.trim()) {
      ElMessage.warning('请输入标题');
      return;
    }
    const payload = {
      title: carouselForm.title.trim(),
      summary: carouselForm.summary.trim() || undefined,
      imageStorageKey: carouselForm.imageStorageKey || undefined,
      imageFileName: carouselForm.imageFileName || undefined,
      targetUrl: carouselForm.targetUrl.trim() || undefined,
      themeCode: carouselForm.themeCode,
      sortNo: Number.isFinite(carouselForm.sortNo) ? carouselForm.sortNo : undefined,
      statusCode: carouselForm.statusCode,
    } as const;

    if (carouselEditingId.value) {
      await updatePortalAdminCarousel(carouselEditingId.value, payload);
      ElMessage.success('已更新');
    } else {
      await createPortalAdminCarousel(payload);
      ElMessage.success('已新增');
    }

    carouselDialogVisible.value = false;
    await loadCarousel();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    carouselSaving.value = false;
  }
}

async function removeCarousel(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该轮播内容？', '提示', { type: 'warning' });
    await deletePortalAdminCarousel(id);
    ElMessage.success('已删除');
    await loadCarousel();
  } catch (error) {
    if (error instanceof Error && error.message.includes('cancel')) return;
  }
}

async function handleCarouselUpload(option: UploadRequestOptions) {
  try {
    const response = await uploadPortalAsset(option.file as File);
    carouselForm.imageStorageKey = response.data.storageKey;
    carouselForm.imageFileName = response.data.fileName;
    carouselForm.imageUrl = response.data.previewUrl;
    option.onSuccess?.(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : '图片上传失败';
    option.onError?.(Object.assign(new Error(message), { status: 500, method: 'POST', url: '/portal/admin/upload' }));
  }
}

function openContentCreate() {
  resetContentForm();
  contentDialogVisible.value = true;
}

function openContentEdit(row: (typeof contentRows.value)[number]) {
  contentEditingId.value = row.id;
  contentForm.title = row.title;
  contentForm.summary = row.summary ?? '';
  contentForm.body = row.body ?? '';
  contentForm.coverStorageKey = row.coverStorageKey ?? '';
  contentForm.coverFileName = row.coverFileName ?? '';
  contentForm.coverUrl = row.coverUrl ?? '';
  contentForm.linkUrl = row.linkUrl ?? '';
  contentForm.sortNo = row.sortNo ?? 0;
  contentForm.statusCode = row.statusCode;
  contentDialogVisible.value = true;
}

async function saveContent() {
  const contentType = currentContentType.value;
  if (!contentType) return;
  contentSaving.value = true;
  try {
    if (!contentForm.title.trim()) {
      ElMessage.warning('请输入标题');
      return;
    }
    const payload = {
      contentType,
      title: contentForm.title.trim(),
      summary: contentForm.summary.trim() || undefined,
      body: contentForm.body.trim() || undefined,
      coverStorageKey: contentForm.coverStorageKey || undefined,
      coverFileName: contentForm.coverFileName || undefined,
      linkUrl: contentForm.linkUrl.trim() || undefined,
      sortNo: Number.isFinite(contentForm.sortNo) ? contentForm.sortNo : undefined,
      statusCode: contentForm.statusCode,
    } as const;

    if (contentEditingId.value) {
      await updatePortalAdminContent(contentEditingId.value, payload);
      ElMessage.success('已更新');
    } else {
      await createPortalAdminContent(payload);
      ElMessage.success('已新增');
    }

    contentDialogVisible.value = false;
    await loadContents();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    contentSaving.value = false;
  }
}

async function removeContent(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该内容？', '提示', { type: 'warning' });
    await deletePortalAdminContent(id);
    ElMessage.success('已删除');
    await loadContents();
  } catch (error) {
    if (error instanceof Error && error.message.includes('cancel')) return;
  }
}

async function handleCoverUpload(option: UploadRequestOptions) {
  try {
    const response = await uploadPortalAsset(option.file as File);
    contentForm.coverStorageKey = response.data.storageKey;
    contentForm.coverFileName = response.data.fileName;
    contentForm.coverUrl = response.data.previewUrl;
    option.onSuccess?.(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : '图片上传失败';
    option.onError?.(Object.assign(new Error(message), { status: 500, method: 'POST', url: '/portal/admin/upload' }));
  }
}

watch(
  () => activeTab.value,
  async (value) => {
    if (value === 'CAROUSEL') {
      await loadCarousel();
      return;
    }
    if (value === 'CONTACT') {
      await loadContactConfig();
      return;
    }
    contentQuery.page = 1;
    await loadContents();
  },
);

onMounted(async () => {
  if (!canManage.value) return;
  await loadCarousel();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">首页内容发布</p>
      <h2>首页内容管理</h2>
      <p>仅“老师、部长”可发布与维护首页轮播、资讯、通知以及三类展示页内容；其他角色只读。</p>
    </div>

    <div v-if="!canManage" class="panel-card">
      <el-result icon="warning" title="无权限" sub-title="仅老师、部长可管理首页内容" />
    </div>

    <div v-else class="panel-card">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane v-for="tab in tabOptions" :key="tab.key" :label="tab.label" :name="tab.key" />
      </el-tabs>

       <div v-if="activeTab === 'CAROUSEL'">
         <div class="toolbar-row">
           <el-input v-model="carouselQuery.keyword" placeholder="搜索标题" clearable @keyup.enter="loadCarousel" />
           <el-select v-model="carouselQuery.statusCode" style="width: 140px">
             <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
           </el-select>
           <el-button type="primary" @click="loadCarousel">查询</el-button>
           <el-button @click="openKnowledgeImport">从智库选择</el-button>
           <el-button type="success" @click="openCarouselCreate">新增轮播</el-button>
         </div>

         <el-table v-loading="carouselLoading" :data="carouselRows" border stripe>
           <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
           <el-table-column label="来源" width="110">
             <template #default="{ row }">
               <el-tag :type="row.sourceType === 'KNOWLEDGE' ? 'success' : 'info'">
                 {{ row.sourceType === 'KNOWLEDGE' ? '智库' : '手工' }}
               </el-tag>
             </template>
           </el-table-column>
           <el-table-column prop="statusCode" label="状态" width="110" />
           <el-table-column prop="sortNo" label="排序" width="90" />
           <el-table-column label="图片" width="140">
             <template #default="{ row }">
               <el-image v-if="row.imageUrl" :src="row.imageUrl" fit="cover" style="width: 120px; height: 54px; border-radius: 8px" />
              <span v-else class="muted">-</span>
            </template>
           </el-table-column>
           <el-table-column prop="targetUrl" label="跳转目标" min-width="200" show-overflow-tooltip />
           <el-table-column label="操作" width="180" fixed="right">
             <template #default="{ row }">
               <el-button
                 v-if="row.sourceType === 'KNOWLEDGE' && row.sourceCreationId"
                 link
                 type="primary"
                 @click="openKnowledgeDetail(row.sourceCreationId)"
               >
                 查看智库
               </el-button>
               <el-button link type="primary" @click="openCarouselEdit(row)">编辑</el-button>
               <el-button link type="danger" @click="removeCarousel(row.id)">删除</el-button>
             </template>
           </el-table-column>
         </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="carouselQuery.page"
            v-model:page-size="carouselQuery.pageSize"
            :page-sizes="[10, 20, 50]"
            background
            layout="total, sizes, prev, pager, next"
            :total="carouselTotal"
            @change="loadCarousel"
          />
         </div>
       </div>

        <div v-else-if="activeTab === 'CONTACT'" v-loading="contactLoading">
          <el-form label-width="110px" style="max-width: 760px">
            <el-form-item label="联系邮箱">
              <el-input v-model="contactForm.contactEmail" placeholder="例如：contact@example.com" maxlength="128" />
            </el-form-item>

            <el-form-item label="公众号图片">
              <div class="upload-row">
                <el-upload :http-request="handlePublicAccountQrUpload" :show-file-list="false" accept="image/*">
                  <el-button>上传图片</el-button>
                </el-upload>
                <el-button v-if="contactForm.publicAccountQrUrl" text type="danger" @click="clearPublicAccountQr">清空</el-button>
                <el-image v-if="contactForm.publicAccountQrUrl" :src="contactForm.publicAccountQrUrl" fit="contain" class="upload-preview" />
                <span v-else class="muted">用于门户首页“联系我们”展示的公众号二维码/图片。</span>
              </div>
            </el-form-item>

            <el-form-item label="通讯地址">
              <el-input v-model="contactForm.contactAddress" type="textarea" :rows="3" maxlength="500" show-word-limit />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="contactSaving" @click="saveContactConfig">保存</el-button>
            </el-form-item>
          </el-form>
        </div>

        <div v-else>
          <div class="toolbar-row">
            <el-input v-model="contentQuery.keyword" placeholder="搜索标题/摘要" clearable @keyup.enter="loadContents" />
            <el-select v-model="contentQuery.statusCode" style="width: 140px">
              <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
           <el-button type="primary" @click="loadContents">查询</el-button>
           <el-button @click="openKnowledgeImport">从智库选择</el-button>
           <el-button type="success" @click="openContentCreate">新增</el-button>
         </div>

         <el-table v-loading="contentLoading" :data="contentRows" border stripe>
           <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
           <el-table-column label="来源" width="110">
             <template #default="{ row }">
               <el-tag :type="row.sourceType === 'KNOWLEDGE' ? 'success' : 'info'">
                 {{ row.sourceType === 'KNOWLEDGE' ? '智库' : '手工' }}
               </el-tag>
             </template>
           </el-table-column>
           <el-table-column prop="statusCode" label="状态" width="110" />
           <el-table-column prop="sortNo" label="排序" width="90" />
           <el-table-column label="封面" width="120">
             <template #default="{ row }">
               <el-image v-if="row.coverUrl" :src="row.coverUrl" fit="cover" style="width: 92px; height: 52px; border-radius: 8px" />
              <span v-else class="muted">-</span>
            </template>
          </el-table-column>
           <el-table-column prop="publishedAt" label="发布时间" width="180" />
           <el-table-column label="操作" width="180" fixed="right">
             <template #default="{ row }">
               <el-button
                 v-if="row.sourceType === 'KNOWLEDGE' && row.sourceCreationId"
                 link
                 type="primary"
                 @click="openKnowledgeDetail(row.sourceCreationId)"
               >
                 查看智库
               </el-button>
               <el-button link type="primary" @click="openContentEdit(row)">编辑</el-button>
               <el-button link type="danger" @click="removeContent(row.id)">删除</el-button>
             </template>
           </el-table-column>
         </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="contentQuery.page"
            v-model:page-size="contentQuery.pageSize"
            :page-sizes="[10, 20, 50]"
            background
            layout="total, sizes, prev, pager, next"
            :total="contentTotal"
            @change="loadContents"
          />
        </div>
      </div>
    </div>

    <el-dialog v-model="carouselDialogVisible" :title="carouselEditingId ? '编辑轮播' : '新增轮播'" width="720px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="carouselForm.title" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="carouselForm.summary" type="textarea" :rows="3" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="图片">
          <div class="upload-row">
            <el-upload :http-request="handleCarouselUpload" :show-file-list="false" accept="image/*">
              <el-button>上传图片</el-button>
            </el-upload>
            <el-image v-if="carouselForm.imageUrl" :src="carouselForm.imageUrl" fit="cover" class="upload-preview" />
            <span v-else class="muted">建议上传横幅图，用于首页大屏轮播。</span>
          </div>
        </el-form-item>
        <el-form-item label="跳转目标">
          <el-input v-model="carouselForm.targetUrl" placeholder="例如：/portal/achievements 或 https://..." maxlength="500" />
        </el-form-item>
        <el-form-item label="主题">
          <el-select v-model="carouselForm.themeCode" style="width: 160px">
            <el-option label="蓝" value="blue" />
            <el-option label="金" value="gold" />
            <el-option label="青" value="teal" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="carouselForm.sortNo" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="carouselForm.statusCode" style="width: 160px">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="carouselDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="carouselSaving" @click="saveCarousel">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="contentDialogVisible" :title="contentEditingId ? '编辑内容' : '新增内容'" width="760px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="contentForm.title" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="contentForm.summary" type="textarea" :rows="3" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="正文">
          <el-input v-model="contentForm.body" type="textarea" :rows="8" placeholder="最小实现：纯文本内容" />
        </el-form-item>
        <el-form-item label="封面">
          <div class="upload-row">
            <el-upload :http-request="handleCoverUpload" :show-file-list="false" accept="image/*">
              <el-button>上传图片</el-button>
            </el-upload>
            <el-image v-if="contentForm.coverUrl" :src="contentForm.coverUrl" fit="cover" class="upload-preview" />
            <span v-else class="muted">可选，用于展示页列表卡片。</span>
          </div>
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="contentForm.linkUrl" placeholder="可选：https://..." maxlength="500" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="contentForm.sortNo" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="contentForm.statusCode" style="width: 160px">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="contentDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="contentSaving" @click="saveContent">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="knowledgeVisible" title="从智库选择内容导入" width="860px" destroy-on-close>
      <div class="toolbar-row">
        <el-input v-model="knowledgeQuery.keyword" placeholder="搜索标题/摘要" clearable @keyup.enter="loadKnowledge" />
        <el-button type="primary" @click="loadKnowledge">查询</el-button>
        <el-tag type="info">目标展示位：{{ activeTab === 'CAROUSEL' ? '首页轮播' : activeTab }}</el-tag>
      </div>

      <el-table v-loading="knowledgeLoading" :data="knowledgeRows" border stripe>
        <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
        <el-table-column prop="author.displayName" label="作者" width="160" />
        <el-table-column prop="reviewedAt" label="审核时间" width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openKnowledgeDetail(row.id)">预览</el-button>
            <el-button link type="success" @click="importFromKnowledge(row.id)">导入</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="knowledgeQuery.page"
          v-model:page-size="knowledgeQuery.pageSize"
          :page-sizes="[10, 20, 50]"
          background
          layout="total, sizes, prev, pager, next"
          :total="knowledgeTotal"
          @change="loadKnowledge"
        />
      </div>
    </el-dialog>
  </section>
</template>

<style scoped>
.muted {
  color: #64748b;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.upload-preview {
  width: 160px;
  height: 72px;
  border-radius: 10px;
  border: 1px solid #e7edf4;
}
</style>
