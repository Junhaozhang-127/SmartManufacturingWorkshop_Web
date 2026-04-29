<script setup lang="ts">
import type { MemberDetail } from '@smw/shared';
import { PermissionCodes, RoleCode } from '@smw/shared';
import { fetchMemberDetail, updateMember } from '@web/api/member';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const editVisible = ref(false);
const submitting = ref(false);
const detail = ref<MemberDetail | null>(null);

const editForm = reactive({
  positionCode: '',
  mobile: '',
  email: '',
  skillTagsText: '',
});

const canMutate = computed(() =>
  [RoleCode.MINISTER, RoleCode.TEACHER].includes(authStore.activeRoleCode ?? RoleCode.INTERN),
);
const canEdit = computed(() => canMutate.value && authStore.permissions.includes(PermissionCodes.memberUpdate));

async function load() {
  loading.value = true;
  try {
    const response = await fetchMemberDetail(String(route.params.id));
    detail.value = response.data;
    editForm.positionCode = response.data.positionCode;
    editForm.mobile = response.data.mobile ?? '';
    editForm.email = response.data.email ?? '';
    editForm.skillTagsText = response.data.skillTags.join(', ');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '成员详情加载失败');
  } finally {
    loading.value = false;
  }
}

async function submitEdit() {
  if (!canEdit.value) return;
  if (!detail.value) return;
  submitting.value = true;
  try {
    await updateMember(detail.value.id, {
      positionCode: editForm.positionCode,
      mobile: editForm.mobile,
      email: editForm.email,
      skillTags: editForm.skillTagsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
    ElMessage.success('成员档案已更新');
    editVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '成员档案更新失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section v-loading="loading" class="page-grid">
    <div v-if="detail" class="panel-card">
      <div class="member-summary-card">
        <div>
          <p class="panel-card__eyebrow">成员档案详情</p>
          <h2>{{ detail.displayName }}</h2>
          <p>{{ detail.orgUnitName }} / {{ detail.positionCode }} / {{ detail.statusCode }}</p>
        </div>
        <div class="member-summary-card__actions">
          <el-button @click="router.back()">返回</el-button>
          <el-button v-if="canEdit" type="primary" @click="editVisible = true">编辑档案</el-button>
        </div>
      </div>

      <div class="member-summary-grid">
        <article class="stat-card">
          <span>入组时间</span>
          <strong>{{ detail.joinDate }}</strong>
        </article>
        <article class="stat-card">
          <span>所属部门</span>
          <strong>{{ detail.departmentName || '-' }}</strong>
        </article>
      </div>

      <el-tabs class="member-detail-tabs">
        <el-tab-pane label="基础信息">
          <dl class="drawer-descriptions">
            <dt>组织</dt>
            <dd>{{ detail.orgUnitName }}</dd>
            <dt>部门</dt>
            <dd>{{ detail.departmentName || '-' }}</dd>
            <dt>角色</dt>
            <dd>
              <el-tag v-for="role in detail.roleCodes" :key="role" class="tag-spacing">{{ role }}</el-tag>
            </dd>
            <dt>技能标签</dt>
            <dd>
              <el-tag v-for="tag in detail.skillTags" :key="tag" class="tag-spacing" effect="plain">{{ tag }}</el-tag>
            </dd>
            <dt>手机号</dt>
            <dd>{{ detail.mobile || '-' }}</dd>
            <dt>邮箱</dt>
            <dd>{{ detail.email || '-' }}</dd>
          </dl>
        </el-tab-pane>

        <el-tab-pane label="成长记录">
          <el-timeline>
            <el-timeline-item
              v-for="record in detail.growthRecords || []"
              :key="record.id"
              :timestamp="record.recordDate"
            >
              <strong>{{ record.title }}</strong>
              <p>{{ record.content || '-' }}</p>
              <span class="drawer-caption">{{ record.recordType }} / {{ record.actorName || '系统' }}</span>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>

        <el-tab-pane label="项目经历与成果">
          <el-table :data="detail.projectExperiences || []" border>
            <el-table-column prop="projectKey" label="项目标识" min-width="160" />
            <el-table-column prop="projectName" label="项目名称" min-width="180" />
            <el-table-column label="来源" min-width="180">
              <template #default="{ row }">{{ row.sourceTypes.join(' / ') }}</template>
            </el-table-column>
            <el-table-column prop="lastActivityDate" label="最近活动时间" min-width="140" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="晋升记录">
          <el-table :data="detail.promotionRecords || []" border>
            <el-table-column prop="applicationNo" label="申请单号" min-width="160" />
            <el-table-column prop="targetPositionCode" label="目标岗位" width="120" />
            <el-table-column prop="statusCode" label="状态" width="120" />
            <el-table-column prop="latestResult" label="最近结果" min-width="220" />
            <el-table-column prop="publicNoticeResult" label="公示结果" min-width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="editVisible" title="编辑成员档案" width="32rem">
      <el-form label-position="top">
        <el-form-item label="岗位">
          <el-input v-model="editForm.positionCode" :disabled="!canEdit" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.mobile" :disabled="!canEdit" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" :disabled="!canEdit" />
        </el-form-item>
        <el-form-item label="技能标签">
          <el-input v-model="editForm.skillTagsText" placeholder="使用逗号分隔" :disabled="!canEdit" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button v-if="canEdit" type="primary" :loading="submitting" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>
