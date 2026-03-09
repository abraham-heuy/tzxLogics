import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGuestFieldsToSupportTicket1772769469731 implements MigrationInterface {
    name = 'AddGuestFieldsToSupportTicket1772769469731'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "guestName" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "guestEmail" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "guestPhone" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_8679e2ff150ff0e253189ca0253"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "assignedToUserId"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "assignedToUserId" uuid`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_8679e2ff150ff0e253189ca0253" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_8679e2ff150ff0e253189ca0253"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "assignedToUserId"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "assignedToUserId" character varying`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_8679e2ff150ff0e253189ca0253" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "guestPhone"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "guestEmail"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "guestName"`);
    }

}
