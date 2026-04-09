<script setup lang="ts">
import type { MemberDetail } from '@smw/shared';
import { PermissionCodes, RoleCode } from '@smw/shared';
import { http } from '@web/api/client';
import { bindMentor, createStageEvaluation, updateMember } from '@web/api/member';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const editVisible = ref(false);
const mentorVisible = ref(false);
const evaluationVisible = ref(false);
const submitting = ref(false);
const detail = ref<MemberDetail | null>(null);

const editForm = reactive({
  positionCode: '',
  mobile: '',
  email: '',
  skillTagsText: '',
});

const mentorForm = reactive({
  mentorUserId: '',
});

const evaluationForm = reactive({
  stageCode: 'MID_TERM',
  summary: '',
  score: 90,
  resultCode: 'PASS',
  nextAction: '',
});

const canMutate = computed(() =>
  [RoleCode.MINISTER, RoleCode.TEACHER].includes(authStore.activeRoleCode ?? RoleCode.INTERN),
);
const canEdit = computed(() => canMutate.value && authStore.permissions.includes(PermissionCodes.memberUpdate));
const canEvaluate = computed(() => authStore.permissions.includes(PermissionCodes.memberApprove));
const canViewFull = computed(() => detail.value?.canViewFull ?? false);

async function load() {
  loading.value = true;
  try {
    const response = await http.get<never, { data: MemberDetail }>(`/members/${String(route.params.id)}`, {
      params: { viewAll: true },
    });
    detail.value = response.data;
    editForm.positionCode = response.data.positionCode;
    editForm.mobile = response.data.mobile ?? '';
    editForm.email = response.data.email ?? '';
    editForm.skillTagsText = response.data.skillTags.join(', ');
    mentorForm.mentorUserId = response.data.mentorUserId ?? '';
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

async function submitMentorBinding() {
  if (!canEdit.value) return;
  if (!detail.value) return;
  submitting.value = true;
  try {
    await bindMentor(detail.value.id, mentorForm.mentorUserId);
    ElMessage.success('导师绑定已更新');
    mentorVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '导师绑定失败');
  } finally {
    submitting.value = false;
  }
}

async function submitEvaluation() {
  if (!canEvaluate.value) return;
  if (!detail.value) return;
  submitting.value = true;
  try {
    await createStageEvaluation(detail.value.id, evaluationForm);
    ElMessage.success('阶段评价已保存');
    evaluationVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '阶段评价保存失败');
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
          <el-button v-if="canEdit && canViewFull" type="primary" @click="editVisible = true">编辑档案</el-button>
          <el-button v-if="canEdit && canViewFull" @click="mentorVisible = true">导师绑定</el-button>
          <el-button v-if="canEvaluate && canViewFull" type="success" plain @click="evaluationVisible = true">
            阶段评价
          </el-button>
        </div>
      </div>

      <div class="member-summary-grid">
        <article class="stat-card">
          <span>账号</span>
          <strong>{{ detail.username }}</strong>
        </article>
        <article class="stat-card">
          <span>导师</span>
          <strong>{{ detail.mentorName || '未绑定' }}</strong>
        </article>
        <article class="stat-card">
          <span>入组时间</span>
          <strong>{{ detail.joinDate }}</strong>
        </article>
        <article class="stat-card">
          <span>所属部门</span>
          <strong>{{ detail.departmentName || '-' }}</strong>
        </article>
        <article v-if="canViewFull" class="stat-card">
          <span>最近转正</span>
          <strong>{{ detail.latestRegularization?.statusCode || '暂无' }}</strong>
        </article>
        <article v-if="canViewFull" class="stat-card">
          <span>最近考核</span>
          <strong>
            {{ detail.latestEvaluation ? `${detail.latestEvaluation.totalScore} / ${detail.latestEvaluation.resultCode}` : '暂无' }}
          </strong>
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
            <template v-if="canViewFull">
              <dt>手机号</dt>
              <dd>{{ detail.mobile || '-' }}</dd>
              <dt>邮箱</dt>
              <dd>{{ detail.email || '-' }}</dd>
            </template>
          </dl>
        </el-tab-pane>

        <el-tab-pane v-if="canViewFull" label="成长记录">
          <el-timeline>
            <el-timeline-item
              v-for="record in detail.growthRecords"
              :key="record.id"
              :timestamp="record.recordDate"
            >
              <strong>{{ record.title }}</strong>
              <p>{{ record.content || '-' }}</p>
              <span class="drawer-caption">{{ record.recordType }} / {{ record.actorName || '系统' }}</span>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>

        <el-tab-pane v-if="canViewFull" label="阶段评价">
          <el-table :data="detail.stageEvaluations" border>
            <el-table-column prop="stageCode" label="阶段" min-width="140" />
            <el-table-column prop="summary" label="评价摘要" min-width="220" />
            <el-table-column prop="score" label="评分" width="100" />
            <el-table-column prop="resultCode" label="结果" width="120" />
            <el-table-column prop="evaluatorName" label="评价人" min-width="120" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane v-if="canViewFull" label="项目经历与成果">
          <el-table :data="detail.projectExperiences" border>
            <el-table-column prop="projectKey" label="项目标识" min-width="160" />
            <el-table-column prop="projectName" label="项目名称" min-width="180" />
            <el-table-column label="来源" min-width="180">
              <template #default="{ row }">{{ row.sourceTypes.join(' / ') }}</template>
            </el-table-column>
            <el-table-column prop="lastActivityDate" label="最近活动时间" min-width="140" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane v-if="canViewFull" label="考核奖惩">
          <div class="page-grid">
            <div class="panel-card">
              <h3>最近考核</h3>
              <div v-if="detail.latestEvaluation" class="drawer-descriptions">
                <dt>周期</dt>
                <dd>{{ detail.latestEvaluation.schemeName }} / {{ detail.latestEvaluation.periodKey }}</dd>
                <dt>自动汇总分</dt>
                <dd>{{ detail.latestEvaluation.autoScore }}</dd>
                <dt>人工补充分</dt>
                <dd>{{ detail.latestEvaluation.manualScore }}</dd>
                <dt>总分</dt>
                <dd>{{ detail.latestEvaluation.totalScore }}</dd>
                <dt>结果</dt>
                <dd>{{ detail.latestEvaluation.resultCode }}</dd>
              </div>
              <el-empty v-else description="暂无最近考核记录" />
            </div>

            <div class="panel-card">
              <h3>奖惩记录</h3>
              <el-table :data="detail.rewardsAndPenalties" border>
                <el-table-column prop="eventType" label="类型" width="100" />
                <el-table-column prop="title" label="标题" min-width="180" />
                <el-table-column prop="levelCode" label="等级" width="120" />
                <el-table-column prop="scoreImpact" label="分值影响" width="120" />
                <el-table-column prop="occurredAt" label="发生时间" width="140" />
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="canViewFull" label="晋升记录">
          <el-table :data="detail.promotionRecords" border>
            <el-table-column prop="applicationNo" label="申请单号" min-width="160" />
            <el-table-column prop="targetPositionCode" label="目标岗位" width="120" />
            <el-table-column prop="statusCode" label="状态" width="120" />
            <el-table-column prop="latestResult" label="最近结果" min-width="220" />
            <el-table-column prop="publicNoticeResult" label="公示结果" min-width="180" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane v-if="canViewFull" label="流程留痕">
          <el-table :data="detail.operationLogs" border>
            <el-table-column prop="actionType" label="动作" min-width="150" />
            <el-table-column prop="fromStatus" label="原状态" min-width="120" />
            <el-table-column prop="toStatus" label="新状态" min-width="120" />
            <el-table-column prop="description" label="说明" min-width="220" />
            <el-table-column prop="operatorName" label="操作人" min-width="120" />
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

    <el-dialog v-model="mentorVisible" title="导师绑定" width="28rem">
      <el-form label-position="top">
        <el-form-item label="导师用户 ID">
          <el-input v-model="mentorForm.mentorUserId" placeholder="请输入导师用户 ID" :disabled="!canEdit" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mentorVisible = false">取消</el-button>
        <el-button v-if="canEdit" type="primary" :loading="submitting" @click="submitMentorBinding">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="evaluationVisible" title="新增阶段评价" width="34rem">
      <el-form label-position="top">
        <el-form-item label="阶段">
          <el-select v-model="evaluationForm.stageCode" style="width: 100%" :disabled="!canEvaluate">
            <el-option label="入组" value="ONBOARDING" />
            <el-option label="首月" value="FIRST_MONTH" />
            <el-option label="中期" value="MID_TERM" />
            <el-option label="转正阶段" value="REGULARIZATION" />
          </el-select>
        </el-form-item>
        <el-form-item label="评价摘要">
          <el-input v-model="evaluationForm.summary" type="textarea" :rows="4" :disabled="!canEvaluate" />
        </el-form-item>
        <el-form-item label="评分">
          <el-input-number v-model="evaluationForm.score" :min="0" :max="100" :disabled="!canEvaluate" />
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="evaluationForm.resultCode" style="width: 100%" :disabled="!canEvaluate">
            <el-option label="通过" value="PASS" />
            <el-option label="观察" value="OBSERVE" />
            <el-option label="待改进" value="IMPROVE" />
          </el-select>
        </el-form-item>
        <el-form-item label="下一步建议">
          <el-input v-model="evaluationForm.nextAction" type="textarea" :rows="3" :disabled="!canEvaluate" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="evaluationVisible = false">取消</el-button>
        <el-button v-if="canEvaluate" type="primary" :loading="submitting" @click="submitEvaluation">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>
