/**
 * The poll status to be set. Valid values
 */
 export declare enum KolPollStatus {
    /**
     *  End the poll manually, but allow it to be viewed publicly.
     */
     TERMINATED = "TERMINATED",
    /**
     * End the poll manually and do not allow it to be viewed publicly.
     */
     ARCHIVED = "ARCHIVED",
}