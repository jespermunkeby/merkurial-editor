import { Branch } from "./version_control/mutable/branch"
import { ProjectRoot } from "./version_control/mutable/projectRoot"
import { User } from "./version_control/mutable/user"
import { CID } from "./version_control/cid"
import { Commit } from "./version_control/immutable/commit"

export type Model = {
    mode: DashboardMode | EditMode | PreviewMode | ReviewMode | ResolveMode
    user: User
}


/**
 * Select or create project
 */
type DashboardMode = {
    type: "DashboardMode"
}

/**
 * Edit mode is used to edit the project. We exit by discarding work or committing it.
 */
type EditMode = {
    type: "EditMode"
    branch: Branch
    workingState: CID<ProjectRoot>
}


/**
 * Preview mode is used to preview the project at a specific branch.
 */
type PreviewMode = {
    type: "PreviewMode"
    branch: Branch
}

/**
 * Review mode is used to review the changes in the branch before merging them into the default branch.
 * Here the user can see the changes (diff) and number of conflicts with the default branch.
 */
type ReviewMode = {
    type: "ReviewMode"
    branch: Branch
}

/**
 * Resolve mode is used to resolve the conflicts in the branch against a specific commit.
 * Chose which version is valid or manually write what should be ther.
 * The work done here results in a new commit on the branch. 
 * The commit will have two parents (the previous commit from the active branch and one from the against commit).
 */
type ResolveMode = {
    type: "ResolveMode"
    branch: Branch
    against: CID<Commit>
}
