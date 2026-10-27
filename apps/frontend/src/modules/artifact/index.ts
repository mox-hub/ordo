/**
 * 产物管理模块（CAP-A-32）公共出口。
 * 跨模块复用请走 shared/components/artifact/ 标准件，勿直取模块内部。
 */
export { artifactApi } from './api/artifact-api';
export type {
  Artifact,
  ArtifactPage,
  ArtifactVersion,
  ArtifactKind,
  ArtifactListQuery,
} from './api/artifact-api';
export { ArtifactsPage } from './pages/artifacts-page';
export { ArtifactDetailPage } from './pages/artifact-detail-page';
